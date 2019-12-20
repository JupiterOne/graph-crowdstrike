import {
  IntegrationStepExecutionContext,
  IntegrationStepExecutionResult,
  createIntegrationRelationship,
} from "@jupiterone/jupiter-managed-integration-sdk";

import {
  createAccountEntity,
  createProtectionServiceEntity,
} from "../jupiterone/converters";
import ProviderGraphObjectCache from "../ProviderGraphObjectCache";

export default {
  id: "prepare-account",
  name: "Prepare Account",
  executionHandler: async (
    executionContext: IntegrationStepExecutionContext,
  ): Promise<IntegrationStepExecutionResult> => {
    const cache = executionContext.clients.getCache();
    const objectCache = new ProviderGraphObjectCache(cache);

    const account = createAccountEntity(executionContext.instance);
    const protectionService = createProtectionServiceEntity(
      executionContext.instance,
    );
    const accountService = createIntegrationRelationship(
      "HAS",
      account,
      protectionService,
    );

    // Be sure to complete cache key file update before adding other entities.
    // This is a problem with the objectCache, there is no mutex on the key file
    // update.
    await objectCache.putAccount(account);

    await Promise.all([
      objectCache.putEntities([protectionService]),
      objectCache.putRelationships([accountService]),
      cache.putEntry({
        key: "endpoint-protection-service",
        data: protectionService,
      }),
    ]);

    await objectCache.putCollectionStates(
      { type: account._type, success: true },
      { type: protectionService._type, success: true },
      { type: accountService._type, success: true },
    );

    return {};
  },
};
