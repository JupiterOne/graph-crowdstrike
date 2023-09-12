import { URLSearchParams } from 'url';

import {
  DiscoverApplication,
  DiscoverApplicationIdentifier,
  Device,
  DeviceIdentifier,
  OAuth2Token,
  PreventionPolicy,
  QueryParams,
  ResourcesResponse,
  Vulnerability,
  ZTA_Score,
  ZeroTrustAssessment,
} from './types';
import { IntegrationLogger } from '@jupiterone/integration-sdk-core';
import { CrowdStrikeApiGateway } from './CrowdStrikeApiGateway';

export const DEFAULT_ATTEMPT_OPTIONS = {
  maxAttempts: 5,
  delay: 30_000,
  timeout: 180_000,
  factor: 2,
};
export const BUFFER_RE_AUTHETICATION_TIME = 60; //seconds

export type FalconAPIClientConfig = {
  logger: IntegrationLogger;
  crowdStrikeApiGateway: CrowdStrikeApiGateway;
};

export type FalconAPIResourceIterationCallback<T> = (
  resources: T[],
) => boolean | void | Promise<boolean | void>;

export class FalconAPIClient {
  private logger: IntegrationLogger;
  private crowdStrikeApiGateway: CrowdStrikeApiGateway;

  constructor({ logger, crowdStrikeApiGateway }: FalconAPIClientConfig) {
    this.logger = logger;
    this.crowdStrikeApiGateway = crowdStrikeApiGateway;
  }

  public async authenticate(): Promise<OAuth2Token> {
    return this.crowdStrikeApiGateway.authenticate();
  }

  /**
   * Iterates the detected devices by listing the AIDs and then fetching the
   * device details, providing pages of the collection to the provided callback.
   *
   * The scroll API is used because it has no limitation on the number of
   * records it will return. However, note the scroll offset value expires after
   * 2 minutes. The device details request time combined with the callback
   * processing time, per page, must be less.
   *
   * @returns Promise
   */
  public async iterateDevices(input: {
    callback: FalconAPIResourceIterationCallback<Device>;
    query?: QueryParams;
  }): Promise<void> {
    return this.crowdStrikeApiGateway.paginateResources<DeviceIdentifier>({
      callback: async (deviceIds) => {
        if (deviceIds.length) {
          // If the scroll lists _no_ recent devices, we don't want to send a malformed request to https://api.crowdstrike.com/devices/entities/devices/v1?
          return input.callback(await this.fetchDevices(deviceIds));
        }
      },
      query: input.query,
      resourcePath: '/devices/queries/devices-scroll/v1',
    });
  }

  /**
   * Iterates through hidden devices.
   * Beta - Docs are unclear how hidden devices are different than devices.
   * @param input
   */
  public async iterateHiddenDevices(input: {
    callback: FalconAPIResourceIterationCallback<Device>;
    query?: QueryParams;
  }): Promise<void> {
    return this.crowdStrikeApiGateway.paginateResources<DeviceIdentifier>({
      callback: async (deviceIds) => {
        if (deviceIds.length) {
          this.logger.info(
            { hiddenDevicesCount: deviceIds.length },
            `Found hidden devices.`,
          );

          // If the scroll lists _no_ recent devices, we don't want to send a malformed request to https://api.crowdstrike.com/devices/entities/devices/v1?
          return input.callback(await this.fetchDevices(deviceIds));
        }
      },
      query: input.query,
      resourcePath: '/devices/queries/devices-hidden/v1',
    });
  }

  /**
   * Iterates the known device vulnerabilities, providing pages
   * of the collection based on the provided query to the provided callback.
   *
   * @param input
   * @returns Promise
   */
  public async iterateVulnerabilities(input: {
    callback: FalconAPIResourceIterationCallback<Vulnerability>;
    query?: QueryParams;
  }): Promise<void> {
    return this.crowdStrikeApiGateway.paginateResources<Vulnerability>({
      callback: input.callback,
      query: input.query,
      resourcePath: '/spotlight/combined/vulnerabilities/v1',
    });
  }
  /**
   * Iterates the known ZTA Scores
   * https://falconpy.io/Service-Collections/Zero-Trust-Assessment.html#getassessmentsbyscorev1
   * @param input
   * @returns Promise
   */
  public async iterateZeroTrustAssessment(input: {
    callback: FalconAPIResourceIterationCallback<ZeroTrustAssessment>;
    query?: QueryParams;
  }): Promise<void> {
    return this.crowdStrikeApiGateway.paginateResources<ZTA_Score>({
      query: input.query,
      callback: async (ztaIdScores) => {
        let ids: string[] = [];
        if (ztaIdScores.length) ids = ztaIdScores.map((score) => score.aid);
        const chunkSize = 25; // This is not strictly necessary, but should make it faster, since we would have x1/40 calls
        for (let i = 0; i < ids.length; i += chunkSize) {
          await input.callback(
            await this.fetchZTADetails(ids.slice(i, i + chunkSize)),
          );
        }
      },
      resourcePath: '/zero-trust-assessment/queries/assessments/v1',
    });
  }

  /**
   * Iterates the known device applications, providing pages
   * of the collection based on the provided query to the provided callback.
   *
   * @param input
   * @returns Promise
   */
  public async iterateApplications(input: {
    callback: FalconAPIResourceIterationCallback<DiscoverApplication>;
    query?: QueryParams;
  }): Promise<void> {
    return this.crowdStrikeApiGateway.paginateResources<DiscoverApplicationIdentifier>(
      {
        callback: async (appsIds) => {
          if (appsIds.length) {
            return input.callback(await this.fetchApplications(appsIds));
          }
        },
        query: input.query,
        resourcePath: '/discover/queries/applications/v1',
      },
    );
  }

  /**
   * Iterates prevention policies using the "combined" API, providing pages of
   * the collection to the provided callback.
   *
   * @returns Promise
   */
  public async iteratePreventionPolicies(input: {
    callback: FalconAPIResourceIterationCallback<PreventionPolicy>;
    query?: QueryParams;
  }): Promise<void> {
    return this.crowdStrikeApiGateway.paginateResources<PreventionPolicy>({
      callback: input.callback,
      query: input.query,
      resourcePath: '/policy/combined/prevention/v1',
    });
  }

  /**
   * Iterates prevention policy member ids, providing pages of the collection
   * to the provided callback. Based on the provided policy id.
   * @param input
   */
  public async iteratePreventionPolicyMemberIds(input: {
    query?: QueryParams;
    callback: FalconAPIResourceIterationCallback<DeviceIdentifier>;
    policyId: string;
  }): Promise<void> {
    return this.crowdStrikeApiGateway.paginateResources<DeviceIdentifier>({
      callback: input.callback,
      resourcePath: '/policy/queries/prevention-members/v1',
      query: {
        ...input.query,
        id: input.policyId,
      },
    });
  }

  private async fetchDevices(ids: string[]): Promise<Device[]> {
    const availabilityZone = this.crowdStrikeApiGateway.getAvailabilityZone();
    const response =
      await this.crowdStrikeApiGateway.executeAPIRequestWithRetries<
        ResourcesResponse<Device>
      >(
        `https://api.${availabilityZone}crowdstrike.com/devices/entities/devices/v2`,
        {
          method: 'POST',
          body: JSON.stringify({ ids }),
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        },
      );

    return response.resources;
  }

  /***
   * ZTA details
   * https://falconpy.io/Service-Collections/Zero-Trust-Assessment.html#getassessmentv1
   */
  private async fetchZTADetails(ids: string[]): Promise<ZeroTrustAssessment[]> {
    const searchParams = new URLSearchParams();
    for (const id of ids) {
      searchParams.append('ids', id);
    }
    const availabilityZone = this.crowdStrikeApiGateway.getAvailabilityZone();

    const response =
      await this.crowdStrikeApiGateway.executeAPIRequestWithRetries<
        ResourcesResponse<ZeroTrustAssessment>
      >(
        `https://api.${availabilityZone}crowdstrike.com/zero-trust-assessment/entities/assessments/v1?` +
          searchParams,
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
          },
        },
      );

    return response.resources;
  }

  /**
   * Discover Service - applications.
   * Swagger: https://assets.falcon.us-2.crowdstrike.com/support/api/swagger-us2.html#/discover/get-applications
   */
  private async fetchApplications(
    ids: string[],
  ): Promise<DiscoverApplication[]> {
    const availabilityZone = this.crowdStrikeApiGateway.getAvailabilityZone();
    const queryParams = ids.map((id) => `ids=${id}`).join('&');
    const response =
      await this.crowdStrikeApiGateway.executeAPIRequestWithRetries<
        ResourcesResponse<DiscoverApplication>
      >(
        `https://api.${availabilityZone}crowdstrike.com/discover/entities/applications/v1?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        },
      );
    return response.resources;
  }
}
