import {
  IntegrationExecutionContext,
  IntegrationInstanceConfig,
  IntegrationInstanceConfigFieldMap,
  IntegrationProviderAuthenticationError,
  IntegrationValidationError,
} from '@jupiterone/integration-sdk-core';
import createFalconAPIClient from './crowdstrike/createFalconAPIClient';

/**
 * A type describing the configuration fields required to execute the
 * integration for a specific account in the data provider.
 *
 * When executing the integration in a development environment, these values may
 * be provided in a `.env` file with environment variables. For example:
 *
 * - `CLIENT_ID=123` becomes `instance.config.clientId = '123'`
 * - `CLIENT_SECRET=abc` becomes `instance.config.clientSecret = 'abc'`
 *
 * Environment variables are NOT used when the integration is executing in a
 * managed environment. For example, in JupiterOne, users configure
 * `instance.config` in a UI.
 */
export const instanceConfigFields: IntegrationInstanceConfigFieldMap = {
  clientId: {
    type: 'string',
    mask: false,
  },
  clientSecret: {
    type: 'string',
    mask: true,
  },
};

export interface CrowdStrikeIntegrationInstanceConfig
  extends IntegrationInstanceConfig {
  clientId: string;
  clientSecret: string;
}

export async function validateInvocation(
  context: IntegrationExecutionContext<CrowdStrikeIntegrationInstanceConfig>,
) {
  const { instance, logger } = context;
  // const { config } = context.instance;

  if (!instance.config.clientId || !instance.config.clientSecret) {
    throw new IntegrationValidationError(
      'Config requires all of {clientId, clientSecret}',
    );
  }

  const client = createFalconAPIClient(instance.config, logger);
  try {
    await client.authenticate();
  } catch (err) {
    throw new IntegrationProviderAuthenticationError({
      cause: err,
      endpoint: 'https://api.crowdstrike.com/oauth2/token',
      status: 'failed',
      statusText: 'auth error',
    });
  }
}
