import {
  IntegrationProviderAuthorizationError,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  createDirectRelationship,
} from '@jupiterone/integration-sdk-core';

import { IntegrationWarnEventName } from '@jupiterone/integration-sdk-core/dist/src/types/logger';
import getOrCreateFalconAPIClient from '../../crowdstrike/getOrCreateFalconAPIClient';
import { IntegrationConfig } from '../../config';
import { Entities, Relationships, StepIds } from '../constants';
import {
  createDiscoverApplicationEntity,
  createSensorAgentKey,
} from '../../jupiterone/converters';
import pMap from 'p-map';

async function fetchDiscoverApplications({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>): Promise<void> {
  const client = getOrCreateFalconAPIClient(instance.config, logger);

  await client
    .iterateApplications({
      query: {
        limit: '100',
      },
      callback: async (apps) => {
        await pMap(
          apps,
          async (app) => {
            if (!app.host?.aid) {
              // Don't create application, it's not useful if it doesn't relates to any HostAgent
              return;
            }

            const appEntity = createDiscoverApplicationEntity(app);
            await jobState.addEntity(appEntity);

            const sensorKey = createSensorAgentKey(app.host.aid);
            if (jobState.hasKey(sensorKey)) {
              await jobState.addRelationship(
                createDirectRelationship({
                  _class: RelationshipClass.HAS,
                  fromKey: sensorKey,
                  fromType: Entities.SENSOR._type,
                  toKey: appEntity._key,
                  toType: appEntity._type,
                }),
              );
            }
          },
          {
            concurrency: 2,
          },
        );
      },
    })
    .catch((err) => {
      if (
        err instanceof IntegrationProviderAuthorizationError &&
        err.status === 403
      ) {
        logger.warn(
          { err },
          'Encountered a 403 while ingesting applications. This is most like a permissions error.',
        );
        logger.publishWarnEvent({
          name: IntegrationWarnEventName.MissingPermission,
          description:
            'Received authorization error when attempting to retrieve applications. Please update credentials to grant access.',
        });
      } else {
        throw err;
      }
    });
}

export const applicationsSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: StepIds.DISCOVER_APPLICATIONS,
    name: 'Fetch Applications',
    entities: [Entities.DISCOVER_APPLICATION],
    relationships: [Relationships.SENSOR_HAS_DISCOVER_APPLICATION],
    dependsOn: [StepIds.DEVICES],
    executionHandler: fetchDiscoverApplications,
  },
];
