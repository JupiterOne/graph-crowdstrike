import {
  createDirectRelationship,
  IntegrationStepExecutionContext,
  RelationshipClass,
  Step,
} from '@jupiterone/integration-sdk-core';
import { Entities, Relationships, StepIds } from '../constants';
import getOrCreateFalconAPIClient from '../../crowdstrike/getOrCreateFalconAPIClient';
import { createPreventionPolicyEntity } from '../../jupiterone/converters';
import { CrowdStrikeIntegrationInstanceConfig } from '../../config';
import { getProtectionServiceEntityFromJobState } from '../account';

export async function fetchPreventionPolicies(
  context: IntegrationStepExecutionContext<CrowdStrikeIntegrationInstanceConfig>,
): Promise<void> {
  const { instance, jobState, logger } = context;

  const protectionServiceEntity = await getProtectionServiceEntityFromJobState(
    jobState,
  );
  const client = getOrCreateFalconAPIClient(instance.config, logger);

  logger.info('Iterating protection policies...');
  await client.iteratePreventionPolicies({
    query: {
      limit: '250',
    },
    callback: async (preventionPolicies) => {
      logger.info(
        { policyCount: preventionPolicies.length },
        'Creating protection policy entities and relationships...',
      );

      for (const preventionPolicy of preventionPolicies) {
        const preventionPolicyEntity = await jobState.addEntity(
          createPreventionPolicyEntity(preventionPolicy),
        );
        await jobState.addRelationship(
          createDirectRelationship({
            from: preventionPolicyEntity,
            _class: RelationshipClass.ENFORCES,
            to: protectionServiceEntity,
          }),
        );
      }
    },
  });
}

export const fetchPreventionPoliciesStep: Step<
  IntegrationStepExecutionContext<CrowdStrikeIntegrationInstanceConfig>
> = {
  id: StepIds.PREVENTION_POLICIES,
  name: 'Fetch Prevention Policies',
  entities: [Entities.PREVENTION_POLICY],
  relationships: [Relationships.PREVENTION_POLICY_ENFORCES_PROTECTION_SERVICE],
  dependsOn: [StepIds.ACCOUNT],
  executionHandler: fetchPreventionPolicies,
};
