import {
  IntegrationStepExecutionContext,
  IntegrationStepExecutionResult,
} from "@jupiterone/jupiter-managed-integration-sdk";

import { createAccountEntity } from "../jupiterone/converters";
import ProviderGraphObjectCache from "../ProviderGraphObjectCache";

export default {
  id: "prepare-account",
  name: "Prepare Account",
  executionHandler: async (
    executionContext: IntegrationStepExecutionContext,
  ): Promise<IntegrationStepExecutionResult> => {
    const cache = new ProviderGraphObjectCache(
      executionContext.clients.getCache(),
    );
    await cache.putAccount(createAccountEntity(executionContext.instance));
    return {};
  },
};
