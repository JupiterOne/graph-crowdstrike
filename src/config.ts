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
  vulnerabilitySeverities: {
    type: 'string',
    mask: false,
  },
  includeClosedVulnerabilities: {
    type: 'boolean',
    mask: false,
  },
};

export interface IntegrationConfig extends IntegrationInstanceConfig {
  clientId: string;
  clientSecret: string;
  availabilityZone?: string;
  vulnerabilitySeverities?: string;
  includeClosedVulnerabilities?: boolean;
}

export async function validateInvocation({
  instance,
  logger,
}: IntegrationExecutionContext<IntegrationConfig>) {
  if (!instance.config.clientId || !instance.config.clientSecret) {
    throw new IntegrationValidationError(
      'Config requires all of {clientId, clientSecret}',
    );
  }

  // If a vulnerability severity filter is included we should validate it
  // otherwise an empty or undefined filter will be handled at the time it is used
  if (instance.config.vulnerabilitySeverities) {
    instance.config.vulnerabilitySeverities =
      instance.config.vulnerabilitySeverities.replace(/\s+/g, '');
    validateSeverities(instance.config.vulnerabilitySeverities);
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

const VALID_SEVERITIES = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'NONE',
  'UNKNOWN',
];

function validateSeverities(severities: string) {
  const sevArr = severities.split(',');
  for (const sev of sevArr) {
    if (!VALID_SEVERITIES.includes(sev)) {
      throw new IntegrationValidationError(
        `Severity - ${sev} - is not valid. Valid vulnerability severities include ${VALID_SEVERITIES.map(
          (v) => v,
        )}`,
      );
    }
  }
}
