import fetch, { RequestInfo, RequestInit, Response } from "node-fetch";

import { DeviceIdentifier, OAuth2TokenResponse } from "./types";
import Timeout from "await-timeout";

type OAuth2Token = {
  token: string;
  expiresAt: number;
};

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

  public async iterateDevices(
    cb: FalconAPIResourceIterationCallback<DeviceIdentifier>,
  ): Promise<void> {
    await this.authenticate();
    await cb([]);
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

  private async executeAPIRequest<T>(
    info: RequestInfo,
    init: RequestInit,
  ): Promise<T> {
    const apiResponse = await executeAPIRequest({
      exec: () => fetch(info, init),
      rateLimitConfig: this.rateLimitConfig,
      rateLimitState: this.rateLimitState,
    });

    this.rateLimitState = apiResponse.rateLimitState;

    if (apiResponse.status >= 400) {
      const err = new Error(`API request error: ${apiResponse.statusText}`);
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
