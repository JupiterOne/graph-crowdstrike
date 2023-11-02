import {
  getRawData,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import { Entities, Relationships, StepIds } from '../constants';
import getOrCreateFalconAPIClient from '../../crowdstrike/getOrCreateFalconAPIClient';
import { PreventionPolicy } from '../../crowdstrike/types';
import { IntegrationConfig } from '../../config';
import { IngestionSources } from '../../constants';

async function fetchDevicePolicyRelationships({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>): Promise<void> {
  const client = getOrCreateFalconAPIClient(instance.config, logger);

  logger.info('Iterating policy members...');
  await jobState.iterateEntities(
    { _type: Entities.PREVENTION_POLICY._type },
    async (preventionPolicyEntity) => {
      const preventionPolicy = getRawData<PreventionPolicy>(
        preventionPolicyEntity,
      );
      if (!preventionPolicy) {
        logger.warn(
          {
            _key: preventionPolicyEntity._key,
          },
          'Could not get prevention policy raw data from entity.',
        );
        return;
      }

      const policyId = preventionPolicy.id;

      let currentPage = 0;
      let totalNumMembers = 0;
      let totalNumDeviceAssignedPolicyRelationships = 0;

      await client.iteratePreventionPolicyMemberIds({
        query: {
          limit: '250',
        },
        policyId: policyId,
        callback: async (memberIds) => {
          logger.info(
            {
              memberCount: memberIds.length,
              policyId,
              currentPage,
            },
            'Processing page of member ids',
          );

          totalNumMembers += memberIds.length;

          for (const deviceId of memberIds) {
            const deviceAssignedPolicyIdRelationshipKey = `${deviceId}|assigned|${policyId}`;

            if (jobState.hasKey(deviceAssignedPolicyIdRelationshipKey)) {
              logger.info(
                {
                  _key: deviceAssignedPolicyIdRelationshipKey,
                  deviceId,
                  policyId,
                },
                'Duplicate device assigned policy relationship key found',
              );

              continue;
            }

            await jobState.addRelationship({
              _key: deviceAssignedPolicyIdRelationshipKey,
              _type: Relationships.SENSOR_ASSIGNED_PREVENTION_POLICY._type,
              _class: RelationshipClass.ASSIGNED,
              _fromEntityKey: deviceId,
              _toEntityKey: policyId,
              displayName: 'ASSIGNED',
            });

            totalNumDeviceAssignedPolicyRelationships++;
          }

          currentPage++;
        },
      });

      logger.info(
        {
          totalNumMembers,
          totalNumDeviceAssignedPolicyRelationships,
        },
        'Successfully processed device policy relationships',
      );
    },
  );
}

export const devicePolicySteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: StepIds.DEVICE_POLICY_RELATIONSHIPS,
    ingestionSourceId: IngestionSources.DEVICE_POLICIES,
    name: 'Fetch Device Policies',
    entities: [],
    relationships: [Relationships.SENSOR_ASSIGNED_PREVENTION_POLICY],
    dependsOn: [StepIds.DEVICES, StepIds.PREVENTION_POLICIES],
    executionHandler: fetchDevicePolicyRelationships,
  },
];
