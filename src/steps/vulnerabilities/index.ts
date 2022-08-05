import {
  createDirectRelationship,
  IntegrationProviderAuthorizationError,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../../config';
import getOrCreateFalconAPIClient from '../../crowdstrike/getOrCreateFalconAPIClient';
import { Entities, Relationships, StepIds } from '../constants';
import { createVulnerabilityEntity } from '../../jupiterone/converters';
import { IntegrationWarnEventName } from '@jupiterone/integration-sdk-core/dist/src/types/logger';
import { createCreatedTimestampFilter } from './util';

async function fetchVulnerabilities({
  instance,
  jobState,
  logger,
  executionHistory,
}: IntegrationStepExecutionContext<IntegrationConfig>): Promise<void> {
  const client = getOrCreateFalconAPIClient(instance.config, logger);
  const lastSuccessfulRun = executionHistory.lastSuccessful?.startedOn;

  const createdTimestampFilter = createCreatedTimestampFilter({
    maxDaysInPast: 10,
    lastSuccessfulRun,
  });

  let duplicateVulnerabilityKeysFoundCount = 0;
  let duplicateVulnerabilitySensorRelationshipKeysFoundCount = 0;
  let sensorEntitiesNotFoundCount = 0;

  const filter = `created_timestamp:>'${createdTimestampFilter}'`;

  await client
    .iterateVulnerabilities({
      query: {
        limit: '250',
        filter,
        sort: `created_timestamp|desc`,
      },
      callback: async (vulns) => {
        logger.info(
          { vulnerabilityCount: vulns.length, createdTimestampFilter },
          'Creating vulnerability entities and relationships...',
        );

        for (const vulnerability of vulns) {
          const vulnerabilityEntity = createVulnerabilityEntity(vulnerability);

          if (jobState.hasKey(vulnerabilityEntity._key)) {
            duplicateVulnerabilityKeysFoundCount++;
          } else {
            await jobState.addEntity(vulnerabilityEntity);
          }

          const sensor = await jobState.findEntity(vulnerability.aid);

          if (!sensor) {
            sensorEntitiesNotFoundCount++;
            continue;
          }

          // TODO: consider breaking this out into a separate step
          const vulnerabilitySensorRelationship = createDirectRelationship({
            from: vulnerabilityEntity,
            _class: RelationshipClass.EXPLOITS,
            to: sensor,
          });

          if (jobState.hasKey(vulnerabilitySensorRelationship._key)) {
            duplicateVulnerabilitySensorRelationshipKeysFoundCount++;
          } else {
            await jobState.addRelationship(vulnerabilitySensorRelationship);
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
          'Encountered a 403 while ingesting vulnerabilities. This is most like a permissions error.',
        );
        logger.publishWarnEvent({
          name: IntegrationWarnEventName.MissingPermission,
          description:
            'Received authorization error when attempting to retrieve vulnerabilities. Please update credentials to grant access.',
        });
      } else {
        throw error;
      }
    });

  logger.info(
    {
      duplicateVulnerabilityKeysFoundCount,
      duplicateVulnerabilitySensorRelationshipKeysFoundCount,
      sensorEntitiesNotFoundCount,
    },
    'Vulnerability step summary',
  );
}

export const vulnerabilitiesSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: StepIds.VULNERABILITIES,
    name: 'Fetch Vulnerabilities',
    entities: [Entities.VULNERABILITY],
    relationships: [Relationships.VULN_EXPLOITS_SENSOR],
    dependsOn: [StepIds.DEVICES],
    executionHandler: fetchVulnerabilities,
  },
];
