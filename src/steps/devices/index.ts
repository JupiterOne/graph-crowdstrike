import {
  createDirectRelationship,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import { Entities, Relationships, StepIds } from '../constants';
import getOrCreateFalconAPIClient from '../../crowdstrike/getOrCreateFalconAPIClient';
import { createSensorAgentEntity } from '../../jupiterone/converters';
import { IntegrationConfig } from '../../config';
import { getAccountEntityFromJobState } from '../account';

export async function fetchDevices(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
): Promise<void> {
  const { instance, jobState, logger } = context;

  const accountEntity = await getAccountEntityFromJobState(jobState);
  const client = getOrCreateFalconAPIClient(instance.config, logger);

  logger.info('Iterating devices...');
  await client.iterateDevices({
    query: {
      filter: `last_seen:>='${lastSeenSince()}'`,
    },
    callback: async (devices) => {
      logger.info(
        { deviceCount: devices.length },
        'Creating device entities and relationships...',
      );

      for (const device of devices) {
        const deviceEntity = await jobState.addEntity(
          createSensorAgentEntity(device),
        );
        await jobState.addRelationship(
          createDirectRelationship({
            from: accountEntity,
            _class: RelationshipClass.HAS,
            to: deviceEntity,
          }),
        );
      }
    },
  });
}

const THIRTY_DAYS_AGO = 30 * 24 * 60 * 60 * 1000;

function lastSeenSince(): string {
  return new Date(Date.now() - THIRTY_DAYS_AGO).toISOString();
}

export const devicesSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: StepIds.DEVICES,
    name: 'Fetch Devices',
    entities: [Entities.SENSOR],
    relationships: [Relationships.ACCOUNT_HAS_SENSOR],
    dependsOn: [StepIds.ACCOUNT],
    executionHandler: fetchDevices,
  },
];
