import {
  createDirectRelationship,
  IntegrationStepExecutionContext,
  RelationshipClass,
  Step,
} from '@jupiterone/integration-sdk-core';
import { CrowdStrikeIntegrationInstanceConfig } from '../config';
import getOrCreateFalconAPIClient from '../crowdstrike/getOrCreateFalconAPIClient';
import { Entities, Relationships, StepIds } from '../constants';
import { createVulnerabilityEntity } from '../jupiterone/converters';

// TODO: Understand the amount of data to be ingested by looking back only 10 days
// const THIRTY_DAYS_AGO = 30 * 24 * 60 * 60 * 1000;
const TEN_DAYS_AGO = 10 * 24 * 60 * 60 * 1000;

export async function fetchVulnerabilities(
  context: IntegrationStepExecutionContext<CrowdStrikeIntegrationInstanceConfig>,
): Promise<void> {
  const { instance, jobState, logger } = context;

  const client = getOrCreateFalconAPIClient(instance.config, logger);
  const lastSuccessfulSyncTime =
    context.executionHistory.lastSuccessful?.startedOn;

  const daysAgo = Date.now() - TEN_DAYS_AGO;

  const createdTimestampFilter = new Date(
    lastSuccessfulSyncTime ?? daysAgo,
  ).toISOString();

  logger.info('Iterating vulnerabilities...');

  let duplicateVulnerabilityKeysFoundCount = 0;
  let duplicateVulnerabilitySensorRelationshipKeysFoundCount = 0;
  let sensorEntitiesNotFoundCount = 0;

  await client.iterateVulnerabilities({
    query: {
      filter: `created_timestamp:>'${createdTimestampFilter}'`,
      sort: `created_timestamp|desc`,
    },
    callBack: async (vulns) => {
      logger.info(
        { vulnerabilityCount: vulns.length, createdTimestampFilter },
        'Creating vulnerability entities and relationships...',
      );

      for (const vulnerability of vulns) {
        const vulnerabilityEntity = createVulnerabilityEntity(vulnerability);

        if (await jobState.hasKey(vulnerabilityEntity._key)) {
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

        if (await jobState.hasKey(vulnerabilitySensorRelationship._key)) {
          duplicateVulnerabilitySensorRelationshipKeysFoundCount++;
        } else {
          await jobState.addRelationship(vulnerabilitySensorRelationship);
        }
      }
    },
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

export const fetchVulnerabilitiesStep: Step<
  IntegrationStepExecutionContext<CrowdStrikeIntegrationInstanceConfig>
> = {
  id: StepIds.VULNERABILITIES,
  name: 'Fetch Vulnerabilities',
  entities: [Entities.VULNERABILITY],
  relationships: [Relationships.VULN_EXPLOITS_SENSOR],
  dependsOn: [StepIds.DEVICES],
  executionHandler: fetchVulnerabilities,
};
