import { IntegrationInvocationConfig } from '@jupiterone/integration-sdk-core';

import { fetchDevicePolicyRelationshipsStep } from './steps/fetchDevicePolicyRelationships';
import { fetchDevicesStep } from './steps/fetchDevices';
import { fetchPreventionPoliciesStep } from './steps/fetchPreventionPolicies';
import { getAccountStep } from './steps/getAccount';
import { fetchVulnerabilitiesStep } from './steps/fetchVulnerabilities';
import {
  CrowdStrikeIntegrationInstanceConfig,
  instanceConfigFields,
  validateInvocation,
} from './config';

export const invocationConfig: IntegrationInvocationConfig<CrowdStrikeIntegrationInstanceConfig> =
  {
    instanceConfigFields,
    validateInvocation,
    integrationSteps: [
      getAccountStep,
      fetchDevicesStep,
      fetchPreventionPoliciesStep,
      fetchDevicePolicyRelationshipsStep,
      fetchVulnerabilitiesStep,
    ],
  };
