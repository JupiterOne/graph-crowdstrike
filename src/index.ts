import { IntegrationInvocationConfig } from "@jupiterone/integration-sdk-core";
import { IntegrationInvocationConfig as ManagedIntegrationInvocationConfig } from "@jupiterone/jupiter-managed-integration-sdk";

import invocationValidator from "./invocationValidator";
import fetchDevicePolicyRelationships from "./managed-steps/fetchDevicePolicyRelationships";
import fetchDevices from "./managed-steps/fetchDevices";
import fetchPreventionPolicies from "./managed-steps/fetchPreventionPolicies";
import prepareAccount from "./managed-steps/prepareAccount";
import synchronize from "./managed-steps/synchronize";
import { fetchDevicesStep } from "./steps/fetchDevices";
import { getAccountStep } from "./steps/getAccount";
import { CrowdStrikeIntegrationInstanceConfig } from "./types";

export const invocationConfig: IntegrationInvocationConfig<CrowdStrikeIntegrationInstanceConfig> = {
  instanceConfigFields: {
    clientId: {
      type: "string",
      mask: false,
    },
    clientSecret: {
      type: "string",
      mask: true,
    },
  },
  /**
   * At the time of converting from the managed SDK to the open-source SDK, the implemented
   * `invocationValidator` is an empty function.
   *
   * TODO implement validateInvocation()
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validateInvocation: () => {},
  integrationSteps: [getAccountStep, fetchDevicesStep],
};

/**
 * A multi-step integration:
 *
 * 1. Create Account and Service entities, storing in provider cache
 * 2. Iterate recently seen devices and all prevention policies from CrowdStrike
 *    API, converting to entities and building relationships to the Account and
 *    Service, storing entities and relationships in provider cache
 * 3. Iterate all integration entities in J1, updating or deleting them
 *    depending on their presence in the provider entity/relationship cache
 * 4. Iterate provider entities/relationships, creating any that were not found
 *    in J1
 *
 * Note that devices not seen since `LAST_SEEN_DAYS_BACK` will be deleted! This
 * maintains a "last 30 days" view of hosts.
 */
export const stepFunctionsInvocationConfig: ManagedIntegrationInvocationConfig = {
  instanceConfigFields: {
    clientId: {
      type: "string",
      mask: false,
    },
    clientSecret: {
      type: "string",
      mask: true,
    },
  },

  invocationValidator,

  integrationStepPhases: [
    {
      steps: [prepareAccount],
    },
    {
      steps: [fetchDevices],
    },
    {
      steps: [fetchPreventionPolicies],
    },
    {
      steps: [fetchDevicePolicyRelationships],
    },
    {
      steps: [synchronize],
    },
  ],
};
