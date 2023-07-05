import { Headers } from 'node-fetch';
import { CrowdStrikeApiGateway } from './CrowdStrikeApiGateway';

const noop = () => {
  // does nothing
};

describe('CrowdStrikeApiGateway', () => {
  const apiGateway = new CrowdStrikeApiGateway();

  describe('handleRedirects', () => {
    describe('given a response with the crowdstrike api domain', () => {
      it('should invoke the handler', () => {
        const headers = new Headers();
        headers.set('location', '/');

        const response = {
          headers,
          url: 'https://api.crowdstrike.com',
        };

        const logger = {
          warn: noop,
          info: noop,
        };

        const handler = (value) => {
          expect(value.href).toBe('https://api.crowdstrike.com/');
        };

        apiGateway.handleRedirects(response, handler, logger);
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

        const handler = noop;

        apiGateway.handleRedirects(response, handler, logger);
      });
    });
  });
});
