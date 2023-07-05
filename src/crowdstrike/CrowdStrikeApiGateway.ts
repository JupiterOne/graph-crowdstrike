import { IntegrationLogger } from '@jupiterone/integration-sdk-core';
import { RateLimitConfig, RateLimitState } from './types';

function getUnixTimeNow() {
  return Date.now() / 1000;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class CrowdStrikeApiGateway {
  public handleRedirects(response, handler, logger) {
    logger.info(
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
      logger.warn(
        { redirectLocationUrl },
        `Encountered an invalid redirect location URL! Redirect prevented.`,
      );
    }
  }

  public async handle429Error(
    rateLimitState: RateLimitState,
    rateLimitConfig: RateLimitConfig,
    logger: IntegrationLogger,
  ) {
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

    logger.info(
      {
        unixTimeNow,
        timeToSleepInSeconds,
        rateLimitState: rateLimitState,
        rateLimitConfig: rateLimitConfig,
      },
      'Encountered 429 response. Waiting to retry request.',
    );
    await sleep(timeToSleepInSeconds * 1000);

    if (
      rateLimitState.limitRemaining &&
      rateLimitState.limitRemaining <= rateLimitConfig.reserveLimit
    ) {
      logger.info(
        {
          rateLimitState: rateLimitState,
          rateLimitConfig: rateLimitConfig,
        },
        'Rate limit remaining is less than reserve limit. Waiting for cooldown period.',
      );
      await sleep(rateLimitConfig.cooldownPeriod);
    }
  }
}
