import {
  IntegrationProviderAuthorizationError,
  IntegrationStep,
  IntegrationStepExecutionContext,
  IntegrationWarnEventName,
  createDirectRelationship,
  getRawData,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../../config';
import { Entities, Relationships, StepIds } from '../constants';
import getOrCreateFalconAPIClient from '../../crowdstrike/getOrCreateFalconAPIClient';
import { createZeroTrustAssessmentEntity } from '../../jupiterone/converters';
import { ZeroTrustAssessment } from '../../crowdstrike/types';
import { IngestionSources } from '../../constants';

async function fetchZeroTrustAssessments({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>): Promise<void> {
  const client = getOrCreateFalconAPIClient(instance.config, logger);
  await client
    .iterateZeroTrustAssessment({
      query: {
        limit: '250',
        filter: 'score:<=50', // Score is the only filter possible. We must include a filter. Score is between [0,100]
      },
      callback: async (zeroTrustAssessments) => {
        for (const zta of zeroTrustAssessments) {
          if (
            !jobState.hasKey(
              `${Entities.ZERO_TRUST_ASSESSMENT._type}|${zta.aid}`,
            )
          ) {
            await jobState.addEntity(createZeroTrustAssessmentEntity(zta));
          } else {
            logger.warn({ zta }, `Duplicated key detected.`);
          }
        }
      },
    })
    .catch((error) => {
      if (
        error instanceof IntegrationProviderAuthorizationError &&
        error.status === 403
      ) {
        logger.warn(
          { error },
          'Encountered a 403 while ingesting zero trust assessments. This is most like a permissions error.',
        );
        logger.publishWarnEvent({
          name: IntegrationWarnEventName.MissingPermission,
          description:
            'Received authorization error when attempting to retrieve zero trust assessments. Please update credentials to grant access.',
        });
      } else {
        throw error;
      }
    });
}

async function fetchZTASensorRelationships({
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>): Promise<void> {
  await jobState.iterateEntities(
    { _type: Entities.ZERO_TRUST_ASSESSMENT._type },
    async (zeroTrustEntity) => {
      const zta = getRawData<ZeroTrustAssessment>(zeroTrustEntity);
      if (!zta) return;
      const deviceEntity = await jobState.findEntity(zta.aid);
      if (!deviceEntity) return;
      await jobState.addRelationship(
        createDirectRelationship({
          from: deviceEntity,
          _class: Relationships.SENSOR_HAS_ZERO_TRUST_ASSESSMENT._class,
          to: zeroTrustEntity,
        }),
      );
    },
  );
}

export const ZTASteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: StepIds.ZERO_TRUST_ASSESSMENT,
    ingestionSourceId: IngestionSources.ZERO_TRUST_ASSESSMENT,
    name: 'Fetch Zero Trust Assessments',
    entities: [Entities.ZERO_TRUST_ASSESSMENT],
    relationships: [],
    dependsOn: [],
    executionHandler: fetchZeroTrustAssessments,
  },
  {
    id: StepIds.ZERO_TRUST_ASSESSMENT_SENSOR_RELATIONSHIPS,
    name: 'Build Zero Trust Sensor Relationship',
    entities: [],
    relationships: [Relationships.SENSOR_HAS_ZERO_TRUST_ASSESSMENT],
    dependsOn: [StepIds.DEVICES, StepIds.ZERO_TRUST_ASSESSMENT],
    executionHandler: fetchZTASensorRelationships,
  },
];
