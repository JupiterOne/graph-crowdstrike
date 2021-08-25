import {
  createIntegrationRelationship,
  EntityFromIntegration,
  IntegrationRelationship,
  IntegrationStepExecutionContext,
  IntegrationStepIterationState,
} from "@jupiterone/jupiter-managed-integration-sdk";

import createFalconAPIClient from "../crowdstrike/createFalconAPIClient";
import getIterationState from "../getIterationState";
import {
  createPreventionPolicyEntity,
  PREVENTION_POLICY_ENFORCES_PROTECTION_RELATIONSHIP_TYPE,
  PREVENTION_POLICY_ENTITY_TYPE,
} from "../jupiterone/converters";
import ProviderGraphObjectCache from "../ProviderGraphObjectCache";

export default {
  id: "fetch-prevention-policies",
  name: "Fetch Prevention Policies",
  iterates: true,
  executionHandler: async (
    executionContext: IntegrationStepExecutionContext,
  ): Promise<IntegrationStepIterationState> => {
    const { instance, logger } = executionContext;

    const cache = executionContext.clients.getCache();
    const objectCache = new ProviderGraphObjectCache(cache);

    const protectionService = (
      await cache.getEntry("endpoint-protection-service")
    ).data;

    const policyIds =
      (await cache.getEntry("prevention-policy-ids")).data || [];

    const falconAPI = createFalconAPIClient(instance.config, logger);

    const iterationState = getIterationState(executionContext);

    logger.info({ iterationState }, "Iterating protection policies...");

    const pagination = await falconAPI.iteratePreventionPolicies({
      callback: async policies => {
        logger.info(
          { policyCount: policies.length },
          "Creating protection policy entities and relationships...",
        );

        const entities: EntityFromIntegration[] = [];
        const relationships: IntegrationRelationship[] = [];
        for (const policy of policies) {
          const entity = createPreventionPolicyEntity(policy);
          entities.push(entity);
          relationships.push(
            createIntegrationRelationship({
              _class: "ENFORCES",
              from: entity,
              to: protectionService,
            }),
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

    await cache.putEntry({ key: "prevention-policy-ids", data: policyIds });

    await objectCache.putCollectionStates(
      {
        type: PREVENTION_POLICY_ENTITY_TYPE,
        success: pagination.finished,
      },
      {
        type: PREVENTION_POLICY_ENFORCES_PROTECTION_RELATIONSHIP_TYPE,
        success: pagination.finished,
      },
    );

    return {
      ...iterationState,
      finished: pagination.finished,
      state: { pagination },
    };
  },
};
