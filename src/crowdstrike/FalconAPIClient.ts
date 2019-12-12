import Timeout from "await-timeout";
import fetch, { RequestInfo, RequestInit, Response } from "node-fetch";

import {
  Device,
  DeviceIdentifier,
  OAuth2TokenResponse,
  ResourcesResponse,
  ScrollOffsetPaginationMeta,
} from "./types";

type OAuth2Token = {
  token: string;
  expiresAt: number;
};

type PaginationState = {
  limit?: number;
  total?: number;
  seen: number;
  pages: number;
  finished: boolean;
};

type ScrollOffsetPaginationState = PaginationState & {
  offset: string;
  expiresAt?: number;
};

type PaginationParams = Partial<ScrollOffsetPaginationState>;

type RateLimitConfig = {
  /**
   * The limit remaining value at which the client should slow down. This
   * prevents the client from consuming all available requests.
   */
  reserveLimit: number;

  /**
   * A recommended period of time in milliseconds to wait between requests when
   * the `reserveLimit` is reached.
   *
   * This can be a value representing the refill rate of a "leaky bucket" or
   * just a guess about how soon another request can be made. Ideally there will
   * be enough information in the response headers to calculate a better value.
   */
  cooldownPeriod: number;

  /**
   * Maximum number of times to retry a request that continues to receive 429
   * responses.
   *
   * The client will respect `x-ratelimit-retryafter`, but should it end up in a
   * battle to get the next allowed request, it will give up after this many
   * tries.
   */
  maxAttempts: number;
};

/**
 * The last seen values from rate limit response headers.
 */
type RateLimitState = {
  /**
   * Maximum number of requests per minute that can be made by all API clients
   * in a customer account. Initial value assumes the published default of 100.
   */
  perMinuteLimit: number;

  /**
   * Number of requests that remain in the account's rate limiting pool. The
   * total number available is not known.
   */
  limitRemaining: number;

  /**
   * The next time when an account's rate limit pool will have at least one
   * request available.
   */
  retryAfter: number;
};

type OAuth2ClientCredentials = {
  clientId: string;
  clientSecret: string;
};

type APIRequest = {
  exec: () => Promise<Response>;
  rateLimitConfig: RateLimitConfig;
  rateLimitState: RateLimitState;
};

type APIResponse = {
  response: Response;
  status: Response["status"];
  statusText: Response["statusText"];
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

export type FalconAPIResourceIterationCallback<T> = (
  resources: T[],
) => boolean | void | Promise<boolean | void>;

export class FalconAPIClient {
  private token: OAuth2Token | undefined;
  private rateLimitConfig: RateLimitConfig;

  constructor(
    private credentials: OAuth2ClientCredentials,
    rateLimitConfig: Partial<RateLimitConfig> = DEFAULT_RATE_LIMIT_CONFIG,
    private rateLimitState: RateLimitState = INITIAL_RATE_LIMIT_STATE,
  ) {
    this.rateLimitConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...rateLimitConfig };
  }

  public async authenticate(): Promise<OAuth2Token> {
    if (!this.token || !isValidToken(this.token)) {
      this.token = await this.requestOAuth2Token();
    }
    return this.token;
  }

  /**
   * Iterates the detected devices by listing the AIDs and then fetching the
   * device details, providing the collection to the provided callback.
   *
   * The scroll API is used because it has no limitation on the number of
   * records it will return. However, note the scroll offset value expires after
   * 2 minutes. The device details request time combined with the callback
   * processing time, per page, must be less.
   *
   * @param cb iteration callback function to handle batches of devices
   * @param filter FQL property filter string, will be URL encoded as value of
   * `filter` GET parameter
   * @param pagination optional pagination parameters
   * @returns undefined when no more pages
   */
  public async iterateDevices({
    cb,
    pagination,
    filter,
  }: {
    cb: FalconAPIResourceIterationCallback<Device>;
    pagination?: PaginationParams;
    filter?: string;
  }): Promise<PaginationState | ScrollOffsetPaginationState> {
    const invocationTime = Date.now();
    if (pagination?.expiresAt && pagination.expiresAt < invocationTime) {
      const expiredAgo = invocationTime - pagination.expiresAt;
      throw new Error(
        `Pagination cursor (offset) expired ${expiredAgo} ms ago`,
      );
    }

    let seen: number = pagination?.seen || 0;
    let total: number = pagination?.total || 0;
    let pages: number = pagination?.pages || 0;
    let finished = false;

    let paginationParams: PaginationParams | undefined = pagination;
    let paginationMeta: ScrollOffsetPaginationMeta | undefined;
    let continuePagination: boolean | void;

    do {
      const response: ResourcesResponse<DeviceIdentifier> = await this.executeAuthenticatedAPIRequest<
        ResourcesResponse<DeviceIdentifier>
      >(
        `https://api.crowdstrike.com/devices/queries/devices-scroll/v1?${toURLSearchParams(
          filter,
          paginationParams,
        )}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        },
      );

      const deviceIds = response.resources;

      continuePagination = await cb(await this.fetchDevices(deviceIds));

      paginationParams = paginationMeta = response.meta
        .pagination as ScrollOffsetPaginationMeta;
      seen += deviceIds.length;
      total = paginationMeta.total;
      pages += 1;
      finished = seen >= total;
    } while (!finished && continuePagination !== false);

    const paginationState: PaginationState = {
      limit: pagination?.limit,
      seen,
      total,
      pages,
      finished,
    };

    if (!finished && paginationMeta) {
      return {
        ...paginationState,
        offset: paginationMeta.offset,
        expiresAt: paginationMeta.expires_at,
      };
    } else {
      return paginationState;
    }
  }

  private async fetchDevices(ids: string[]): Promise<Device[]> {
    const params = new URLSearchParams();
    for (const aid of ids) {
      params.append("ids", aid);
    }

    const response = await this.executeAuthenticatedAPIRequest<
      ResourcesResponse<Device>
    >(`https://api.crowdstrike.com/devices/entities/devices/v1?${params}`, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });

    return response.resources;
  }

  private async requestOAuth2Token(): Promise<OAuth2Token> {
    const params = new URLSearchParams();
    params.append("client_id", this.credentials.clientId);
    params.append("client_secret", this.credentials.clientSecret);

    const response = await this.executeAPIRequest<OAuth2TokenResponse>(
      "https://api.crowdstrike.com/oauth2/token",
      {
        method: "POST",
        headers: {
          accept: "application/json",
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
    const apiResponse = await executeAPIRequest({
      exec: () => fetch(info, init),
      rateLimitConfig: this.rateLimitConfig,
      rateLimitState: this.rateLimitState,
    });

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
}

async function executeAPIRequest<T>(request: APIRequest): Promise<APIResponse> {
  const config = request.rateLimitConfig;

  let attempts = 0;
  let rateLimitState = request.rateLimitState;

  do {
    const tryAfterCooldown =
      rateLimitState.limitRemaining <= config.reserveLimit
        ? Date.now() + config.cooldownPeriod
        : 0;

    const tryAfter = Math.max(rateLimitState.retryAfter, tryAfterCooldown);

    const response = await tryAPIRequest(request.exec, tryAfter);

    rateLimitState = {
      limitRemaining:
        Number(response.headers.get("x-ratelimit-remaining")) ||
        rateLimitState.limitRemaining,
      perMinuteLimit:
        Number(response.headers.get("x-ratelimit-limit")) ||
        rateLimitState.perMinuteLimit,
      retryAfter: Number(response.headers.get("x-ratelimit-retryafter") || 0),
    };

    if (response.status !== 429) {
      return {
        response,
        rateLimitState,
        status: response.status,
        statusText: response.statusText,
      };
    }

    attempts += 1;
  } while (attempts < request.rateLimitConfig.maxAttempts);

  throw new Error(`Could not complete request within ${attempts} attempts!`);
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

function toURLSearchParams(
  filter?: string,
  pagination?: PaginationParams,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filter) {
    params.append("filter", filter);
  }

  if (pagination) {
    if (typeof pagination.limit === "number") {
      params.append("limit", String(pagination.limit));
    }
    if (pagination.offset !== undefined) {
      params.append("offset", String(pagination.offset));
    }
  }

  return params;
}
