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
import {
  createFQLTimestamp,
  getAccountEntityFromJobState,
  getDateInPast,
} from '../util';

async function fetchDevices({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>): Promise<void> {
  const accountEntity = await getAccountEntityFromJobState(jobState);
  const client = getOrCreateFalconAPIClient(instance.config, logger);

  logger.info('Iterating devices...');

  const timestamp = createFQLTimestamp(getDateInPast(30));

  await client.iterateDevices({
    query: {
      filter: `last_seen:>='${timestamp}'`,
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

  if (instance.config.enableHiddenDevices) {
    logger.info('Iterating hidden devices...');

    await client.iterateHiddenDevices({
      query: {
        filter: `last_seen:>='${timestamp}'`,
      },
      callback: async (devices) => {
        logger.info(
          { deviceCount: devices.length },
          'Creating device entities and relationships (hidden)...',
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
