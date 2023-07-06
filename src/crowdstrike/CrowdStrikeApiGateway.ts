import {
  IntegrationLogger,
  IntegrationProviderAPIError,
  IntegrationProviderAuthenticationError,
  IntegrationProviderAuthorizationError,
} from '@jupiterone/integration-sdk-core';
import { retry } from '@lifeomic/attempt';
import {
  OAuth2ClientCredentials,
  OAuth2Token,
  PaginationMeta,
  PaginationParams,
  QueryParams,
  RateLimitConfig,
  RateLimitState,
  ResourcesResponse,
} from './types';
import { RequestInit } from 'node-fetch';
import { FalconAPIResourceIterationCallback } from './FalconAPIClient';
import { ICrowdStrikeApiClientQueryBuilder } from './CrowdStrikeApiClientQueryBuilder';
import { Total } from './Total';

function getUnixTimeNow() {
  return Date.now() / 1000;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type AttemptOptions = {
  maxAttempts: number;
  delay: number;
  timeout: number;
  factor: number;
};

export const DEFAULT_ATTEMPT_OPTIONS = {
  maxAttempts: 5,
  delay: 30_000,
  timeout: 180_000,
  factor: 2,
};

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  reserveLimit: 30,
  cooldownPeriod: 1000,
};

export class CrowdStrikeApiGateway {
  private rateLimitState: RateLimitState;
  private token: OAuth2Token | undefined;
  private credentials: OAuth2ClientCredentials;
  private attemptOptions: AttemptOptions;
  private logger: IntegrationLogger;
  private readonly rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG;
  private total: Total;
  private queryBuilder: ICrowdStrikeApiClientQueryBuilder;
  private fetcher;

  constructor(
    credentials: OAuth2ClientCredentials,
    logger: IntegrationLogger,
    queryBuilder: ICrowdStrikeApiClientQueryBuilder,
    fetcher,
    attemptOptions?: AttemptOptions,
  ) {
    this.queryBuilder = queryBuilder;
    this.total = new Total();
    this.credentials = credentials;
    this.logger = logger;
    this.attemptOptions = attemptOptions ?? DEFAULT_ATTEMPT_OPTIONS;
    this.fetcher = fetcher;

    this.credentials.availabilityZone = credentials.availabilityZone
      ? `${credentials.availabilityZone}.`
      : '';
  }

  public getAvailabilityZone(): string {
    return this.credentials.availabilityZone || '';
  }

  public handleRedirects(response, handler) {
    this.logger.info(
      {
        locationHeader: response.headers.get('location'),
        responseUrl: response.url,
      },
      'Encountered a redirect.',
    );

    const redirectLocationUrl = new URL(
      response.headers.get('location'),
      response.url,
    );

    const validUrls = /^api\.(\S+\.)?crowdstrike.com/;

    if (validUrls.test(redirectLocationUrl.host)) {
      return handler(redirectLocationUrl);
    } else {
      this.logger.warn(
        { redirectLocationUrl },
        `Encountered an invalid redirect location URL! Redirect prevented.`,
      );
    }
  }

  public async handle429Error(rateLimitState: RateLimitState) {
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
        rateLimitState: rateLimitState,
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
          rateLimitState: rateLimitState,
          rateLimitConfig: this.rateLimitConfig,
        },
        'Rate limit remaining is less than reserve limit. Waiting for cooldown period.',
      );
      await sleep(this.rateLimitConfig.cooldownPeriod);
    }
  }

  public async authenticate(): Promise<OAuth2Token> {
    if (!this.token || !isValidToken(this.token)) {
      this.token = await this.requestOAuth2Token();
    }

    return this.token;
  }

  private async requestOAuth2Token(): Promise<OAuth2Token> {
    this.logger.info('Fetching new access token');

    const params = new URLSearchParams();
    params.append('client_id', this.credentials.clientId);
    params.append('client_secret', this.credentials.clientSecret);

    const authRequestAttempt = async () => {
      const endpoint = `https://api.${this.credentials.availabilityZone}crowdstrike.com/oauth2/token`;
      const response = await this.fetcher(endpoint, {
        method: 'POST',
        headers: {
          accept: 'application/json',
        },
        body: params,
      });

      if (response.ok) {
        return response.json();
      } else {
        throw new IntegrationProviderAPIError({
          status: response.status,
          statusText: response.statusText,
          endpoint,
        });
      }
    };

    const response = await retry(authRequestAttempt, {
      ...this.attemptOptions,
      handleError: (error, attemptContext) => {
        if (error.status === 400) {
          attemptContext.abort();
          return;
        }
        if (error.status === 403) {
          throw new IntegrationProviderAuthenticationError({
            status: error.status,
            statusText: error.statusText,
            endpoint: error.endpoint,
          });
        }

        this.logger.warn(
          { attemptContext, error },
          `Hit a possibly recoverable error when authenticating. Waiting before trying again.`,
        );
      },
    });

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

  public async executeAPIRequestWithRetries<T>(
    requestUrl: string,
    init: RequestInit,
  ): Promise<T> {
    /**
     * This is the logic to be retried in the case of an error.
     */
    const requestAttempt = async () => {
      const token = await this.authenticate();
      const startTime = Date.now();
      const response = await this.fetcher(requestUrl, {
        ...init,
        headers: {
          ...init.headers,
          authorization: `bearer ${token!.token}`,
        },
        redirect: 'manual',
      });
      this.logger.debug(
        {
          requestUrl,
          requestDuration: Date.now() - startTime,
        },
        'Calculated request duration',
      );

      this.rateLimitState = {
        limitRemaining: Number(response.headers.get('X-RateLimit-Remaining')),
        perMinuteLimit: Number(response.headers.get('X-RateLimit-Limit')),
        retryAfter: response.headers.get('X-RateLimit-RetryAfter')
          ? Number(response.headers.get('X-RateLimit-RetryAfter'))
          : undefined,
      };
      // Manually handle redirects.
      if ([301, 302, 308].includes(response.status)) {
        return this.handleRedirects(response, (redirectLocationUrl) => {
          return this.executeAPIRequestWithRetries<T>(
            redirectLocationUrl,
            init,
          );
        });
      }

      if (response.ok) {
        return response.json();
      }

      if (response.status === 401) {
        throw new IntegrationProviderAuthenticationError({
          status: response.status,
          statusText: response.statusText,
          endpoint: requestUrl,
        });
      }
      if (response.status === 403) {
        throw new IntegrationProviderAuthorizationError({
          status: response.status,
          statusText: response.statusText,
          endpoint: requestUrl,
        });
      }
      throw new IntegrationProviderAPIError({
        status: response.status,
        statusText: response.statusText,
        endpoint: requestUrl,
      });
    };

    return retry(requestAttempt, {
      ...this.attemptOptions,
      handleError: async (error, attemptContext) => {
        this.logger.debug(
          { error, attemptContext },
          'Error being handled in handleError.',
        );

        if (error.status === 401) {
          if (attemptContext.attemptNum > 1) {
            attemptContext.abort();
            return;
          } else {
            await this.authenticate();
          }
        }
        if (error.status === 403) {
          attemptContext.abort();
          return;
        }
        if (error.status === 429) {
          await this.handle429Error(this.rateLimitState);
        }

        this.logger.warn(
          { attemptContext, error },
          `Hit a possibly recoverable error when requesting data. Waiting before trying again.`,
        );
      },
    });
  }

  public async paginateResources<ResourceType>({
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
    const availabilityZone = this.getAvailabilityZone();

    do {
      const url = this.queryBuilder.buildResourcePathUrl(
        availabilityZone,
        resourcePath,
        paginationParams,
        query,
      );

      this.logger.info({ requestUrl: url, paginationParams });
      const response: ResourcesResponse<ResourceType> =
        await this.executeAPIRequestWithRetries<
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

export const BUFFER_RE_AUTHETICATION_TIME = 60; //seconds

function isValidToken(token: OAuth2Token): boolean {
  return (
    token && token.expiresAt > getUnixTimeNow() + BUFFER_RE_AUTHETICATION_TIME
  ); // Will the token be valid in [number] seconds?
}
