import {
  createDirectRelationship,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import { Entities, Relationships, StepIds } from '../constants';
import getOrCreateFalconAPIClient from '../../crowdstrike/getOrCreateFalconAPIClient';
import { createPreventionPolicyEntity } from '../../jupiterone/converters';
import { IntegrationConfig } from '../../config';
import { getProtectionServiceEntityFromJobState } from '../util';
import { IngestionSources } from '../../constants';

async function fetchPreventionPolicies({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>): Promise<void> {
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

export const preventionPoliciesSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: StepIds.PREVENTION_POLICIES,
    ingestionSourceId: IngestionSources.PREVENTION_POLICIES,
    name: 'Fetch Prevention Policies',
    entities: [Entities.PREVENTION_POLICY],
    relationships: [
      Relationships.PREVENTION_POLICY_ENFORCES_PROTECTION_SERVICE,
    ],
    dependsOn: [StepIds.ACCOUNT],
    executionHandler: fetchPreventionPolicies,
  },
];
