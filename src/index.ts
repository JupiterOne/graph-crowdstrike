import { IntegrationInvocationConfig } from "@jupiterone/jupiter-managed-integration-sdk";

import invocationValidator from "./invocationValidator";
import fetchDevices from "./steps/fetchDevices";
import prepareAccount from "./steps/prepareAccount";
import synchronize from "./steps/synchronize";
import fetchPreventionPolicies from "./steps/fetchPreventionPolicies";

/**
 * A multi-step integration:
 *
 * 1. Create an Account entity using the integration instance name, storing in
 *    provider entities cache
 * 2. Iterates recently seen devices from CrowdStrike API, converting to
 *    entities and building relationships to the Account, storing entities and
 *    relationships in provider cache
 * 3. Iterates entities in J1, updating or deleting them depending on their
 *    presence in the provider entity/relationship cache
 * 4. Iterates provider entities/relationships, creating any that were no found
 *    in J1
 *
 * Note that devices not seen since `LAST_SEEN_DAYS_BACK` will be deleted! This
 * maintains a "last 30 days" view of hosts.
 */
export const invocationConfig: IntegrationInvocationConfig = {
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
      steps: [synchronize],
    },
  ],
};
