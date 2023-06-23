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
import { createApplicationEntity } from '../../jupiterone/converters';
import pMap from 'p-map';

async function fetchApplications({
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
            const appEntity = createApplicationEntity(app);

            await jobState.addEntity(appEntity);

            if (app.host?.aid && jobState.hasKey(app.host?.aid)) {
              await jobState.addRelationship(
                createDirectRelationship({
                  _class: RelationshipClass.HAS,
                  fromKey: app.host?.aid,
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
    id: StepIds.APPLICATIONS,
    name: 'Fetch Applications',
    entities: [Entities.APPLICATION],
    relationships: [Relationships.SENSOR_HAS_APPLICATION],
    dependsOn: [StepIds.DEVICES],
    executionHandler: fetchApplications,
  },
];
