import {
  IntegrationExecutionContext,
  StepStartStates,
} from '@jupiterone/integration-sdk-core';
import { CrowdStrikeIntegrationInstanceConfig } from './types';
import { fetchVulnerabilitiesStep } from './steps/fetchVulnerabilities';
import { fetchDevicesStep } from './steps/fetchDevices';
import { fetchDevicePolicyRelationshipsStep } from './steps/fetchDevicePolicyRelationships';
import { fetchPreventionPoliciesStep } from './steps/fetchPreventionPolicies';
import { getAccountStep } from './steps/getAccount';

/**
 * Introduced to allow for specific accounts to trial the vulnerabilities step.
 * TODO: Remove me once vuln step has been proven.
 * @param executionContext
 */
export default function getStepStartStates(
  executionContext: IntegrationExecutionContext<CrowdStrikeIntegrationInstanceConfig>,
): StepStartStates {
  return {
    [getAccountStep.id]: { disabled: false },
    [fetchDevicesStep.id]: { disabled: false },
    [fetchDevicePolicyRelationshipsStep.id]: { disabled: false },
    [fetchPreventionPoliciesStep.id]: { disabled: false },
    [fetchVulnerabilitiesStep.id]: {
      disabled:
        !(executionContext.instance.config as any)
          .enableFetchVulnerabilitiesStep ?? true,
    },
  };
}
