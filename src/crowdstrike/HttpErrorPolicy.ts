import {
  IntegrationProviderAuthenticationError,
  IntegrationProviderAuthorizationError,
  IntegrationProviderAPIError,
} from '@jupiterone/integration-sdk-core';

export const httpErrorPolicy = {
  handleError(response, requestUrl: string) {
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
  },
};
