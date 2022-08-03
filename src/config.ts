import {
  IntegrationExecutionContext,
  IntegrationInstanceConfig,
  IntegrationInstanceConfigFieldMap,
  IntegrationValidationError,
} from '@jupiterone/integration-sdk-core';
import getOrCreateFalconAPIClient from './crowdstrike/getOrCreateFalconAPIClient';

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
  availabilityZone: {
    type: 'string',
    mask: false,
  },
};

export interface IntegrationConfig extends IntegrationInstanceConfig {
  clientId: string;
  clientSecret: string;
  availabilityZone?: string;
}

export async function validateInvocation(
  context: IntegrationExecutionContext<IntegrationConfig>,
) {
  const { instance, logger } = context;

  if (!instance.config.clientId || !instance.config.clientSecret) {
    throw new IntegrationValidationError(
      'Config requires all of {clientId, clientSecret}',
    );
  }

  const client = getOrCreateFalconAPIClient(instance.config, logger);
  try {
    await client.authenticate();
  } catch (error) {
    if (error.status == 400) {
      // Falcon API responds with 400 when the clientId is not valid.
      throw new IntegrationValidationError('Invalid clientId');
    }

    throw error;
  }
}
