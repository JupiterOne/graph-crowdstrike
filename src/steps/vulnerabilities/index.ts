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
import { createVulnerabilityFQLFilter } from './util';

// maxDaysInPast is set to 10 days because most integrations will run at least once a week.
// Additionally, at the time of this comment, we are just using the `created_timestamp`
// as a filter, so the quantity of data can still be extremely large.
const maxDaysInPast = 10;

async function fetchVulnerabilities({
  instance,
  jobState,
  logger,
  executionHistory,
}: IntegrationStepExecutionContext<IntegrationConfig>): Promise<void> {
  const client = getOrCreateFalconAPIClient(instance.config, logger);
  let duplicateVulnerabilityKeysFoundCount = 0;
  let duplicateVulnerabilitySensorRelationshipKeysFoundCount = 0;
  let sensorEntitiesNotFoundCount = 0;

  const filter = createVulnerabilityFQLFilter({
    config: instance.config,
    executionHistory,
    maxDaysInPast,
  });

  await client
    .iterateVulnerabilities({
      query: {
        limit: '250',
        filter,
        sort: `created_timestamp|desc`,
        facet: 'cve',
      },
      callback: async (vulns) => {
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
