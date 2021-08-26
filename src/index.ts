import { IntegrationInvocationConfig } from "@jupiterone/integration-sdk-core";

import { fetchDevicePolicyRelationshipsStep } from "./steps/fetchDevicePolicyRelationships";
import { fetchDevicesStep } from "./steps/fetchDevices";
import { fetchPreventionPoliciesStep } from "./steps/fetchPreventionPolicies";
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
  integrationSteps: [
    getAccountStep,
    fetchDevicesStep,
    fetchPreventionPoliciesStep,
    fetchDevicePolicyRelationshipsStep,
  ],
};
