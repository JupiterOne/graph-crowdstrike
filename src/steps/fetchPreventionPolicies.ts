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
    const cache = new ProviderGraphObjectCache(
      executionContext.clients.getCache(),
    );
    const falconAPI = new FalconAPIClient(executionContext.instance.config);

    const iterationState = getIterationState(executionContext);

    const newState = await falconAPI.iteratePreventionPolicies({
      cb: async policies => {
        const policyEntities: EntityFromIntegration[] = [];
        const hostPolicyRelationships: IntegrationRelationship[] = [];
        for (const policy of policies) {
          const entity = createPreventionPolicyEntity(policy);
          policyEntities.push(entity);
          // TODO relate to crowdstrike_endpoint_protection Service
          // TODO look up related host ids, build relationships to hosts
          // hostPolicyRelationships.push(
          //   createIntegrationRelationship("HAS", entity, hostEntity),
          // );
        }
        await Promise.all([
          cache.putEntities(policyEntities),
          cache.putRelationships(hostPolicyRelationships),
        ]);
      },
      pagination: iterationState.state,
    });

    return {
      ...iterationState,
      finished: newState.finished,
      state: newState,
    };
  },
};
