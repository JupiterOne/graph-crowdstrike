import { Headers } from 'node-fetch';
import { CrowdStrikeApiGateway } from './CrowdStrikeApiGateway';
import * as sinon from 'sinon';
import { config } from '../../test/config';
import { CrowdStrikeApiClientQueryBuilder } from './CrowdStrikeApiClientQueryBuilder';

const noop = () => {
  // does nothing
};

describe('CrowdStrikeApiGateway', () => {
  const queryBuilder = new CrowdStrikeApiClientQueryBuilder();

  describe('handleRedirects', () => {
    describe('given a response with the crowdstrike api domain', () => {
      it('should invoke the handler', () => {
        const logger = {
          warn: noop,
          info: noop,
        };
        const apiGateway = new CrowdStrikeApiGateway(
          config,
          logger as any,
          queryBuilder,
        );
        const headers = new Headers();
        headers.set('location', '/');

        const response = {
          headers,
          url: 'https://api.crowdstrike.com',
        };

        const handler = (value) => {
          expect(value.href).toBe('https://api.crowdstrike.com/');
        };

        apiGateway.handleRedirects(response, handler);
      });
    });

    describe('given a response with a different domain', () => {
      it('should print a warning', () => {
        const headers = new Headers();
        headers.set('location', '/');

        const response = {
          headers,
          url: 'https://api.other-domain.com',
        };

        const logger = {
          warn: (meta, message) => {
            expect(meta.redirectLocationUrl).toBeDefined();
            expect(message).toEqual(
              'Encountered an invalid redirect location URL! Redirect prevented.',
            );
          },
          info: noop,
        };

        const apiGateway = new CrowdStrikeApiGateway(
          config,
          logger as any,
          queryBuilder,
        );

        const handler = noop;

        apiGateway.handleRedirects(response, handler);
      });
    });
  });

  describe('handle429Error', () => {
    describe('given a limitRemaining less than the reserveLimit', () => {
      it('should wait for the cooldwon period', async () => {
        const logger = {
          warn: noop,
          info: sinon.spy(),
        };
        const apiGateway = new CrowdStrikeApiGateway(
          config,
          logger as any,
          queryBuilder,
        );

        await apiGateway.handle429Error({
          retryAfter: 100,
          limitRemaining: 10,
          perMinuteLimit: 10,
        });

        expect(logger.info.callCount).toBe(2);
        expect(logger.info.firstCall.args[0].rateLimitConfig).toEqual({
          cooldownPeriod: 1000,
          reserveLimit: 30,
        });
        expect(logger.info.firstCall.args[0].rateLimitState).toEqual({
          limitRemaining: 10,
          retryAfter: 100,
          perMinuteLimit: 10,
        });
        expect(logger.info.firstCall.args[1]).toEqual(
          'Encountered 429 response. Waiting to retry request.',
        );

        expect(logger.info.secondCall.args[0]).toEqual({
          rateLimitConfig: {
            cooldownPeriod: 1000,
            reserveLimit: 30,
          },
          rateLimitState: {
            limitRemaining: 10,
            retryAfter: 100,
            perMinuteLimit: 10,
          },
        });
        expect(logger.info.secondCall.args[1]).toEqual(
          'Rate limit remaining is less than reserve limit. Waiting for cooldown period.',
        );
      });
    });
  });
});
