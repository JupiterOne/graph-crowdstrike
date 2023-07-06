import { httpErrorPolicy } from './HttpErrorPolicy';

describe('HttpErrorPolicy', () => {
  describe('handleError()', () => {
    describe('given any other HTTP Error', () => {
      it('should return an IntegrationProviderAPIError', () => {
        try {
          httpErrorPolicy.handleError({ status: 1 }, 'https://url.com');
        } catch (err) {
          expect(err.code).toEqual('PROVIDER_API_ERROR');
          expect(err.endpoint).toEqual('https://url.com');
        }
      });
    });

    describe('given a 401 HTTP Error', () => {
      it('should return an IntegrationProviderAuthenticationError', () => {
        try {
          httpErrorPolicy.handleError({ status: 401 }, 'https://url.com');
        } catch (err) {
          expect(err.code).toEqual('PROVIDER_AUTHENTICATION_ERROR');
          expect(err.endpoint).toEqual('https://url.com');
        }
      });
    });

    describe('given a 403 HTTP Error', () => {
      it('should return an IntegrationProviderAuthorizationError', () => {
        try {
          httpErrorPolicy.handleError({ status: 403 }, 'https://url.com');
        } catch (err) {
          expect(err.code).toEqual('PROVIDER_AUTHORIZATION_ERROR');
          expect(err.endpoint).toEqual('https://url.com');
        }
      });
    });
  });
});
