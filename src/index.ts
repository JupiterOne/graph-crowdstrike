import "cross-fetch/polyfill";

import {
  createIntegrationEntity,
  EntityFromIntegration,
  IntegrationInstance,
  IntegrationInvocationConfig,
  IntegrationStepExecutionContext,
  IntegrationStepExecutionResult,
} from "@jupiterone/jupiter-managed-integration-sdk";

import invocationValidator from "./invocationValidator";

function createAccountEntity(
  integrationInstance: IntegrationInstance,
): EntityFromIntegration {
  return createIntegrationEntity({
    entityData: {
      source: {},
      assign: {
        _class: "Account",
        _type: "crowdstrike_account",
        _key: integrationInstance.id,
      },
    },
  });
}
export const stepFunctionsInvocationConfig: IntegrationInvocationConfig = {
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
      steps: [
        {
          id: "account",
          name: "Fetch Account",
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ): Promise<IntegrationStepExecutionResult> => {
            const newAccount = createAccountEntity(executionContext.instance);
            const cache = executionContext.clients.getCache();
            await cache
              .iterableCache("entities")
              .putEntries([{ key: newAccount._key, data: newAccount }]);
            return {};
          },
        },
      ],
    },
  ],
};
