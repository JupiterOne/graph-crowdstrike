import {
  createDirectRelationship,
  Entity,
  IntegrationProviderAuthorizationError,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../../config';
import getOrCreateFalconAPIClient from '../../crowdstrike/getOrCreateFalconAPIClient';
import { Entities, Relationships, StepIds } from '../constants';
import {
  createApplicationEntity,
  createVulnerabilityEntity,
} from '../../jupiterone/converters';
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
  let duplicateVulnerabilityApplicationRelationshipKeysFoundCount = 0;
  let sensorEntitiesNotFoundCount = 0;

  const filter = createVulnerabilityFQLFilter({
    config: instance.config,
    executionHistory,
    maxDaysInPast,
  });

  await client
    .iterateVulnerabilities({
      query: {
        limit: instance.config.vulnerabilitiesLimit ?? '400',
        filter,
        sort: `created_timestamp|desc`,
        facet: 'cve',
      },
      callback: async (vulns) => {
        for (const vulnerability of vulns) {
          const vulnerabilityEntity = createVulnerabilityEntity(vulnerability);
          const iterationPromises: Promise<Entity | void | null>[] = [];

          if (jobState.hasKey(vulnerabilityEntity._key)) {
            duplicateVulnerabilityKeysFoundCount++;
          } else {
            iterationPromises.push(jobState.addEntity(vulnerabilityEntity));
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
            iterationPromises.push(
              jobState.addRelationship(vulnerabilitySensorRelationship),
            );
          }

          for (const app of vulnerability.apps || []) {
            const appEntity = createApplicationEntity(app);

            // We probably don't want to count the duplicate apps, since the single app could have multiple findings (e.g. might be expected scenario)
            if (!jobState.hasKey(appEntity._key)) {
              iterationPromises.push(jobState.addEntity(appEntity));
            }

            const vulnerabilityApplicationRelationship =
              createDirectRelationship({
                from: appEntity,
                _class: RelationshipClass.HAS,
                to: vulnerabilityEntity,
              });

            if (jobState.hasKey(vulnerabilityApplicationRelationship._key)) {
              duplicateVulnerabilityApplicationRelationshipKeysFoundCount++;
            } else {
              iterationPromises.push(
                jobState.addRelationship(vulnerabilityApplicationRelationship),
              );
            }
          }

          await Promise.all(iterationPromises);
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
      duplicateVulnerabilityApplicationRelationshipKeysFoundCount,
      sensorEntitiesNotFoundCount,
    },
    'Vulnerability step summary',
  );
}

export const vulnerabilitiesSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: StepIds.VULNERABILITIES,
    name: 'Fetch Vulnerabilities',
    entities: [Entities.VULNERABILITY, Entities.APPLICATION],
    relationships: [
      Relationships.VULN_EXPLOITS_SENSOR,
      Relationships.APP_HAS_VULN,
    ],
    dependsOn: [StepIds.DEVICES],
    executionHandler: fetchVulnerabilities,
  },
];
