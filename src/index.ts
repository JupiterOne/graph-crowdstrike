import { IntegrationInvocationConfig } from '@jupiterone/integration-sdk-core';

import { fetchDevicePolicyRelationshipsStep } from './steps/devicePolicies';
import { fetchDevicesStep } from './steps/devices';
import { fetchPreventionPoliciesStep } from './steps/preventionPolicies';
import { getAccountStep } from './steps/account';
import { fetchVulnerabilitiesStep } from './steps/vulnerabilities';
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
