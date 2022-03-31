import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch';
import { URLSearchParams } from 'url';

import {
  Device,
  DeviceIdentifier,
  OAuth2ClientCredentials,
  OAuth2Token,
  OAuth2TokenResponse,
  PaginationMeta,
  PaginationParams,
  PreventionPolicy,
  QueryParams,
  RateLimitConfig,
  RateLimitState,
  ResourcesResponse,
  Vulnerability,
} from './types';
import { IntegrationLogger } from '@jupiterone/integration-sdk-core';

function getUnixTimeNow() {
  return Date.now() / 1000;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type APIRequest = {
  url: string;
  exec: () => Promise<Response>;
};

type APIResponse = {
  response: Response;
  status: Response['status'];
  statusText: Response['statusText'];
};

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  reserveLimit: 30,
  cooldownPeriod: 1000,
};

export type FalconAPIClientConfig = {
  credentials: OAuth2ClientCredentials;
  logger: IntegrationLogger;
};

export type FalconAPIResourceIterationCallback<T> = (
  resources: T[],
) => boolean | void | Promise<boolean | void>;

export class FalconAPIClient {
  private credentials: OAuth2ClientCredentials;
  private token: OAuth2Token | undefined;
  private logger: IntegrationLogger;
  private rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG;

  constructor({ credentials, logger }: FalconAPIClientConfig) {
    this.credentials = credentials;
    this.logger = logger;
  }

  public async authenticate(): Promise<OAuth2Token> {
    if (!this.token || !isValidToken(this.token)) {
      this.token = await this.requestOAuth2Token();
    }
    return this.token;
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
          return await input.callback(await this.fetchDevices(deviceIds));
        }
      },
      query: input.query,
      resourcePath: '/devices/queries/devices-scroll/v1',
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
    callBack: FalconAPIResourceIterationCallback<Vulnerability>;
    query?: QueryParams;
  }): Promise<void> {
    return this.paginateResources<Vulnerability>({
      callback: input.callBack,
      query: input.query,
      resourcePath: '/spotlight/combined/vulnerabilities/v1',
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
  }): Promise<void> {
    return this.paginateResources<PreventionPolicy>({
      callback: input.callback,
      resourcePath: '/policy/combined/prevention/v1',
    });
  }

  /**
   * Iterates prevention policy member ids, providing pages of the collection
   * to the provided callback. Based on the provided policy id.
   * @param input
   */
  public async iteratePreventionPolicyMemberIds(input: {
    callback: FalconAPIResourceIterationCallback<DeviceIdentifier>;
    policyId: string;
  }): Promise<void> {
    return this.paginateResources<DeviceIdentifier>({
      callback: input.callback,
      resourcePath: '/policy/queries/prevention-members/v1',
      query: { id: input.policyId },
    });
  }

  private async fetchDevices(ids: string[]): Promise<Device[]> {
    const params = new URLSearchParams();
    for (const aid of ids) {
      params.append('ids', aid);
    }

    const response = await this.executeAuthenticatedAPIRequest<
      ResourcesResponse<Device>
    >(`https://api.crowdstrike.com/devices/entities/devices/v1?${params}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    });

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

    do {
      const response: ResourcesResponse<ResourceType> =
        await this.executeAuthenticatedAPIRequest<
          ResourcesResponse<ResourceType>
        >(
          `https://api.crowdstrike.com${resourcePath}?${toQueryString(
            paginationParams,
            query,
          )}`,
          {
            method: 'GET',
            headers: {
              accept: 'application/json',
            },
          },
        );

      await callback(response.resources);

      paginationParams = response.meta.pagination as PaginationMeta;
      seen += response.resources.length;
      total = paginationParams.total!;
      finished = seen === 0 || seen >= total;
    } while (!finished);
  }

  private async requestOAuth2Token(): Promise<OAuth2Token> {
    this.logger.info('Fetching new access token');

    const params = new URLSearchParams();
    params.append('client_id', this.credentials.clientId);
    params.append('client_secret', this.credentials.clientSecret);

    const response = await this.executeAPIRequest<OAuth2TokenResponse>(
      'https://api.crowdstrike.com/oauth2/token',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
        },
        body: params,
      },
    );

    const expiresAt = getUnixTimeNow() + response.expires_in;
    this.logger.info(
      {
        expiresAt,
        expires_in: response.expires_in,
      },
      'Fetched new access token',
    );
    return {
      token: response.access_token,
      expiresAt,
    };
  }

  private async executeAuthenticatedAPIRequest<ResponseType>(
    info: RequestInfo,
    init: RequestInit,
  ): Promise<ResponseType> {
    const token = await this.authenticate();
    return this.executeAPIRequest<ResponseType>(info, {
      ...init,
      headers: { ...init.headers, authorization: `bearer ${token.token}` },
    });
  }

  private async executeAPIRequest<ResponseType>(
    info: RequestInfo,
    init: RequestInit,
  ): Promise<ResponseType> {
    const apiResponse = await this.executeAPIRequestWithRateLimitRetries({
      url: info as string,
      exec: () => fetch(info, init),
    });

    if (apiResponse.status >= 400) {
      const err = new Error(
        `API request error for ${info}: ${apiResponse.statusText}`,
      );
      Object.assign(err, { code: apiResponse.status });
      throw err;
    }

    return apiResponse.response.json();
  }

  private async executeAPIRequestWithRateLimitRetries<T>(
    request: APIRequest,
  ): Promise<APIResponse> {
    let attempts = 0;
    let rateLimitState: RateLimitState;

    do {
      const response = await request.exec();

      rateLimitState = {
        limitRemaining: Number(response.headers.get('X-RateLimit-Remaining')),
        perMinuteLimit: Number(response.headers.get('X-RateLimit-Limit')),
        retryAfter:
          response.headers.get('X-RateLimit-RetryAfter') &&
          Number(response.headers.get('X-RateLimit-RetryAfter')),
      };

      if (response.status !== 429 && response.status !== 500) {
        return {
          response,
          status: response.status,
          statusText: response.statusText,
        };
      }

      if (response.status === 429) {
        const unixTimeNow = getUnixTimeNow();
        /**
         * We have seen in the wild that waiting until the
         * `x-ratelimit-retryafter` unix timestamp before retrying requests
         * does often still result in additional 429 errors. This may be caused
         * by incorrect logic on the API server, out-of-sync clocks between
         * client and server, or something else. However, we have seen that
         * waiting an additional minute does result in successful invocations.
         *
         * `timeToSleepInSeconds` adds 60s to the `retryAfter` property, but
         * may be reduced in the future.
         */
        const timeToSleepInSeconds = rateLimitState.retryAfter
          ? rateLimitState.retryAfter + 60 - unixTimeNow
          : 0;
        this.logger.info(
          {
            unixTimeNow,
            timeToSleepInSeconds,
            rateLimitState,
            rateLimitConfig: this.rateLimitConfig,
          },
          'Encountered 429 response. Waiting to retry request.',
        );
        await sleep(timeToSleepInSeconds * 1000);
        if (
          rateLimitState.limitRemaining &&
          rateLimitState.limitRemaining <= this.rateLimitConfig.reserveLimit
        ) {
          this.logger.info(
            {
              rateLimitState,
              rateLimitConfig: this.rateLimitConfig,
            },
            'Rate limit remaining is less than reserve limit. Waiting for cooldown period.',
          );
          await sleep(this.rateLimitConfig.cooldownPeriod);
        }
      }

      attempts += 1;
      this.logger.warn(
        {
          rateLimitState,
          attempts,
          url: request.url,
          status: response.status,
        },
        'Encountered retryable status code from Crowdstrike API',
      );
    } while (attempts < this.rateLimitConfig.maxAttempts);

    throw new Error(`Could not complete request within ${attempts} attempts!`);
  }
}

function isValidToken(token: OAuth2Token): boolean {
  return !!(token && token.expiresAt > getUnixTimeNow());
}

function toQueryString(
  pagination?: {
    limit?: number;
    offset?: number | string;
  },
  queryParams?: object,
): URLSearchParams {
  const params = new URLSearchParams();

  if (pagination) {
    if (typeof pagination.limit === 'number') {
      params.append('limit', String(pagination.limit));
    }
    if (pagination.offset !== undefined) {
      params.append('offset', String(pagination.offset));
    }
  }

  if (queryParams) {
    for (const e of Object.entries(queryParams)) {
      params.append(e[0], String(e[1]));
    }
  }

  return params;
}
