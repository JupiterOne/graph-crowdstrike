import {
  EntityFromIntegration,
  IntegrationRelationship,
  IntegrationStepExecutionContext,
  IntegrationStepIterationState,
} from "@jupiterone/jupiter-managed-integration-sdk";

import { FalconAPIClient } from "../crowdstrike";
import getIterationState from "../getIterationState";
import { createPreventionPolicyEntity } from "../jupiterone/converters";
import ProviderGraphObjectCache from "../ProviderGraphObjectCache";

export default {
  id: "fetch-prevention-policies",
  name: "Fetch Prevention Policies",
  iterates: true,
  executionHandler: async (
    executionContext: IntegrationStepExecutionContext,
  ): Promise<IntegrationStepIterationState> => {
    const cache = executionContext.clients.getCache();
    const objectCache = new ProviderGraphObjectCache(cache);
    const policyIds =
      (await cache.getEntry("prevention-policy-ids")).data || [];

    const falconAPI = new FalconAPIClient(executionContext.instance.config);

    const iterationState = getIterationState(executionContext);

    const pagination = await falconAPI.iteratePreventionPolicies({
      cb: async policies => {
        const policyEntities: EntityFromIntegration[] = [];
        const hostPolicyRelationships: IntegrationRelationship[] = [];
        for (const policy of policies) {
          const entity = createPreventionPolicyEntity(policy);
          policyEntities.push(entity);
          policyIds.push(policy.id);
          // TODO relate to crowdstrike_endpoint_protection Service
        }
        await objectCache.putEntities(policyEntities);
        await objectCache.putRelationships(hostPolicyRelationships);
        await cache.putEntry({
          key: "prevention-policy-ids",
          data: policyIds,
        });
      },
      pagination: iterationState.state,
    });

    return {
      ...iterationState,
      finished: pagination.finished,
      state: pagination,
    };
  },
};
