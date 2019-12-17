import {
  EntityFromIntegration,
  IntegrationRelationship,
  IntegrationStepExecutionContext,
  IntegrationStepIterationState,
  createIntegrationRelationship,
} from "@jupiterone/jupiter-managed-integration-sdk";

import { FalconAPIClient } from "../crowdstrike";
import getIterationState from "../getIterationState";
import { createPreventionPolicyEntity } from "../jupiterone/converters";
import ProviderGraphObjectCache from "../ProviderGraphObjectCache";
import { PaginationState } from "../crowdstrike/types";

export default {
  id: "fetch-prevention-policies",
  name: "Fetch Prevention Policies",
  iterates: true,
  executionHandler: async (
    executionContext: IntegrationStepExecutionContext,
  ): Promise<IntegrationStepIterationState> => {
    const { logger } = executionContext;

    const cache = executionContext.clients.getCache();
    const objectCache = new ProviderGraphObjectCache(cache);

    const protectionService = (
      await cache.getEntry("endpoint-protection-service")
    ).data as EntityFromIntegration;

    const policyIds =
      (await cache.getEntry("prevention-policy-ids")).data || [];

    const falconAPI = new FalconAPIClient(executionContext.instance.config);

    const iterationState = getIterationState(executionContext);

    logger.info({ iterationState }, "Iterating protection policies...");

    let pagination: PaginationState | undefined =
      iterationState.state.pagination;

    pagination = await falconAPI.iteratePreventionPolicies({
      cb: async policies => {
        logger.info(
          { pagination },
          "Creating protection policy entities and relationships...",
        );

        const entities: EntityFromIntegration[] = [];
        const relationships: IntegrationRelationship[] = [];
        for (const policy of policies) {
          const entity = createPreventionPolicyEntity(policy);
          entities.push(entity);
          relationships.push(
            createIntegrationRelationship(
              "ENFORCES",
              entity,
              protectionService,
            ),
          );
          policyIds.push(policy.id);
        }
        await Promise.all([
          await objectCache.putEntities(entities),
          await objectCache.putRelationships(relationships),
        ]);
      },
      pagination: iterationState.state.pagination,
    });

    await cache.putEntry({
      key: "prevention-policy-ids",
      data: policyIds,
    });

    return {
      ...iterationState,
      finished: pagination.finished,
      state: { pagination },
    };
  },
};
