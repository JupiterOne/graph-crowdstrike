import { URLSearchParams } from 'url';

import {
  Device,
  DeviceIdentifier,
  OAuth2Token,
  PaginationMeta,
  PaginationParams,
  PreventionPolicy,
  QueryParams,
  ResourcesResponse,
  Vulnerability,
  ZTA_Score,
  ZeroTrustAssessment,
} from './types';
import { IntegrationLogger } from '@jupiterone/integration-sdk-core';
import { IFalconApiClientQueryBuilder } from './FalconApiClientQueryBuilder';
import { Total } from './Total';
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
  queryBuilder: IFalconApiClientQueryBuilder;
  crowdStrikeApiGateway: CrowdStrikeApiGateway;
};

export type FalconAPIResourceIterationCallback<T> = (
  resources: T[],
) => boolean | void | Promise<boolean | void>;

export class FalconAPIClient {
  private logger: IntegrationLogger;
  private queryBuilder: IFalconApiClientQueryBuilder;
  private total: Total;
  private crowdStrikeApiGateway: CrowdStrikeApiGateway;

  constructor({
    logger,
    queryBuilder,
    crowdStrikeApiGateway,
  }: FalconAPIClientConfig) {
    this.logger = logger;
    this.queryBuilder = queryBuilder;
    this.total = new Total();
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
    return this.paginateResources<DeviceIdentifier>({
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
    return this.paginateResources<DeviceIdentifier>({
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
    return this.paginateResources<Vulnerability>({
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
    return this.paginateResources<ZTA_Score>({
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
   * Iterates prevention policies using the "combined" API, providing pages of
   * the collection to the provided callback.
   *
   * @returns Promise
   */
  public async iteratePreventionPolicies(input: {
    callback: FalconAPIResourceIterationCallback<PreventionPolicy>;
    query?: QueryParams;
  }): Promise<void> {
    return this.paginateResources<PreventionPolicy>({
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
    return this.paginateResources<DeviceIdentifier>({
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
        ResourcesResponse<any>
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

  private async paginateResources<ResourceType>({
    callback,
    resourcePath,
    query,
  }: {
    callback: FalconAPIResourceIterationCallback<ResourceType>;
    resourcePath: string;
    query?: QueryParams;
  }): Promise<void> {
    let seen: number = 0;
    let total: number = 0;
    let finished = false;

    let paginationParams: PaginationParams | undefined = undefined;
    const availabilityZone = this.crowdStrikeApiGateway.getAvailabilityZone();

    do {
      const url = this.queryBuilder.buildResourcePathUrl(
        availabilityZone,
        resourcePath,
        paginationParams,
        query,
      );

      this.logger.info({ requestUrl: url, paginationParams });
      const response: ResourcesResponse<ResourceType> =
        await this.crowdStrikeApiGateway.executeAPIRequestWithRetries<
          ResourcesResponse<ResourceType>
        >(url, {
          method: 'GET',
          headers: {
            accept: 'application/json',
          },
        });

      if (response.errors?.length) {
        const errorsToLog = response.errors.map((err) => {
          return { code: err.code, message: err.message, id: err.id };
        });

        this.logger.error(
          { errors: errorsToLog },
          'encountered error(s) in api response',
        );
      }

      await callback(response.resources);

      this.logger.info(
        {
          pagination: response.meta,
          resourcesLength: response.resources.length,
          errors: response.errors,
        },
        'pagination response details',
      );

      paginationParams = response.meta.pagination as PaginationMeta;
      seen += response.resources.length;

      const baseUrl = this.queryBuilder.buildResourcePathUrl(
        availabilityZone,
        resourcePath,
      );

      this.total.setValue(baseUrl, paginationParams?.total);

      total = this.total.getValue(baseUrl);

      finished = seen === 0 || seen >= total;

      this.logger.info(
        { seen, total, finished },
        'post-request pagination state',
      );
    } while (!finished);
  }
}
