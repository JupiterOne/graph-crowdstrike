import Timeout from 'await-timeout';
import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch';
import EventEmitter from 'events';
import { URLSearchParams } from 'url';

import {
  Device,
  DeviceIdentifier,
  NumericOffsetPaginationParams,
  NumericOffsetPaginationState,
  OAuth2ClientCredentials,
  OAuth2Token,
  OAuth2TokenResponse,
  PaginationMeta,
  PaginationParams,
  PaginationState,
  PreventionPolicy,
  QueryParams,
  RateLimitConfig,
  RateLimitState,
  ResourcesResponse,
} from './types';
import { IntegrationLogger } from '@jupiterone/integration-sdk-core';

type APIRequest = {
  url: string;
  exec: () => Promise<Response>;
  rateLimitConfig: RateLimitConfig;
  rateLimitState: RateLimitState;
};

type APIResponse = {
  response: Response;
  status: Response['status'];
  statusText: Response['statusText'];
  rateLimitState: RateLimitState;
};

const INITIAL_RATE_LIMIT_STATE: RateLimitState = {
  limitRemaining: 300,
  perMinuteLimit: 100,
  retryAfter: 0,
};

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  reserveLimit: 30,
  cooldownPeriod: 1000,
};

export enum ClientEvents {
  REQUEST = 'ClientEvents.REQUEST',
  RESPONSE = 'ClientEvents.RESPONSE',
}

export type FalconAPIClientConfig = {
  credentials: OAuth2ClientCredentials;
  rateLimitConfig?: Partial<RateLimitConfig>;
  rateLimitState?: RateLimitState;
  logger: IntegrationLogger;
};

export type FalconAPIResourceIterationCallback<T> = (
  resources: T[],
) => boolean | void | Promise<boolean | void>;

export class FalconAPIClient {
  private credentials: OAuth2ClientCredentials;
  private token: OAuth2Token | undefined;
  private rateLimitConfig: RateLimitConfig;
  private rateLimitState: RateLimitState;
  private logger: IntegrationLogger;

  public events: EventEmitter;

  constructor({
    credentials,
    rateLimitConfig,
    rateLimitState,
    logger,
  }: FalconAPIClientConfig) {
    this.credentials = credentials;
    this.rateLimitConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...rateLimitConfig };
    this.rateLimitState = rateLimitState || INITIAL_RATE_LIMIT_STATE;
    this.events = new EventEmitter();
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
   * @returns pagination state for use in subsequent pagination
   */
  public async iterateDevices(input: {
    callback: FalconAPIResourceIterationCallback<Device>;
    pagination?: PaginationParams;
    query?: QueryParams;
  }): Promise<PaginationState> {
    return this.paginateResources<DeviceIdentifier>({
      ...input,
      callback: async (deviceIds) => {
        if (deviceIds.length) {
          // If the scroll lists _no_ recent devices, we don't want to send a malformed request to https://api.crowdstrike.com/devices/entities/devices/v1?
          return await input.callback(await this.fetchDevices(deviceIds));
        }
      },
      resourcePath: '/devices/queries/devices-scroll/v1',
    });
  }

  /**
   * Iterates prevention policies using the "combined" API, providing pages of
   * the collection to the provided callback.
   *
   * @returns pagination state for use in subsequent pagination
   */
  public async iteratePreventionPolicies(input: {
    callback: FalconAPIResourceIterationCallback<PreventionPolicy>;
    pagination?: NumericOffsetPaginationParams;
    query?: QueryParams;
  }): Promise<NumericOffsetPaginationState> {
    return this.paginateResources<PreventionPolicy>({
      ...input,
      resourcePath: '/policy/combined/prevention/v1',
    }) as Promise<NumericOffsetPaginationState>;
  }

  public async iteratePreventionPolicyMemberIds(input: {
    callback: FalconAPIResourceIterationCallback<DeviceIdentifier>;
    policyId: string;
    pagination?: NumericOffsetPaginationParams;
    query?: QueryParams;
  }): Promise<NumericOffsetPaginationState> {
    return this.paginateResources<DeviceIdentifier>({
      ...input,
      resourcePath: '/policy/queries/prevention-members/v1',
      query: { ...input.query, id: input.policyId },
    }) as Promise<NumericOffsetPaginationState>;
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
    pagination,
    query,
  }: {
    callback: FalconAPIResourceIterationCallback<ResourceType>;
    resourcePath: string;
    pagination?: PaginationParams;
    query?: QueryParams;
  }): Promise<PaginationState> {
    if (pagination?.expiresAt) {
      const invocationTime = Date.now();
      if (pagination.expiresAt < invocationTime) {
        const expiredAgo = invocationTime - pagination.expiresAt;
        throw new Error(
          `Pagination cursor (offset) expired ${expiredAgo} ms ago`,
        );
      }
    }

    let seen: number = pagination?.seen || 0;
    let total: number = pagination?.total || 0;
    let pages: number = pagination?.pages || 0;
    let finished = false;

    let paginationParams: PaginationParams | undefined = pagination;
    let paginationMeta: PaginationMeta | undefined;
    let continuePagination: boolean | void;

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

      continuePagination = await callback(response.resources);

      paginationParams = paginationMeta = response.meta
        .pagination as PaginationMeta;
      seen += response.resources.length;
      total = paginationMeta.total;
      pages += 1;
      finished = seen === 0 || seen >= total;
    } while (!finished && continuePagination !== false);

    const paginationState: PaginationState = {
      limit: pagination?.limit,
      seen,
      total,
      pages,
      finished,
    };

    if (!finished) {
      paginationState.offset = paginationMeta?.offset;
      paginationState.expiresAt = paginationMeta?.expires_at;
    }

    return paginationState;
  }

  private async requestOAuth2Token(): Promise<OAuth2Token> {
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

    return {
      token: response.access_token,
      expiresAt: Date.now() + response.expires_in,
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
    const apiResponse = await this.executeAPIRequestWithRateLimitRetries(
      {
        url: info as string,
        exec: () => fetch(info, init),
        rateLimitConfig: this.rateLimitConfig,
        rateLimitState: this.rateLimitState,
      },
      this.events,
    );

    this.rateLimitState = apiResponse.rateLimitState;

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
    events: EventEmitter,
  ): Promise<APIResponse> {
    const config = request.rateLimitConfig;

    let attempts = 0;
    let rateLimitState = request.rateLimitState;

    do {
      const tryAfterCooldown =
        rateLimitState.limitRemaining <= config.reserveLimit
          ? Date.now() + config.cooldownPeriod
          : 0;

      const tryAfter = Math.max(rateLimitState.retryAfter, tryAfterCooldown);

      events.emit(ClientEvents.REQUEST, {
        url: request.url,
        rateLimitConfig: request.rateLimitConfig,
        rateLimitState: request.rateLimitState,
        tryAfter,
        attempts,
      });

      const response = await tryAPIRequest(request.exec, tryAfter);

      rateLimitState = {
        limitRemaining:
          Number(response.headers.get('x-ratelimit-remaining')) ||
          rateLimitState.limitRemaining,
        perMinuteLimit:
          Number(response.headers.get('x-ratelimit-limit')) ||
          rateLimitState.perMinuteLimit,
        retryAfter: Number(
          response.headers.get('x-ratelimit-retryafter') || 1000,
        ),
      };

      events.emit(ClientEvents.RESPONSE, {
        url: request.url,
        rateLimitConfig: request.rateLimitConfig,
        rateLimitState: request.rateLimitState,
        tryAfter,
        attempts,
      });

      if (response.status !== 429 && response.status !== 500) {
        return {
          response,
          rateLimitState,
          status: response.status,
          statusText: response.statusText,
        };
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
    } while (attempts < request.rateLimitConfig.maxAttempts);

    throw new Error(`Could not complete request within ${attempts} attempts!`);
  }
}

async function tryAPIRequest(
  request: () => Promise<Response>,
  tryAfter: number,
): Promise<Response> {
  const now = Date.now();
  if (tryAfter > now) {
    await Timeout.set(tryAfter - now);
  }
  return request();
}

function isValidToken(token: OAuth2Token): boolean {
  return !!(token && token.expiresAt > Date.now());
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
