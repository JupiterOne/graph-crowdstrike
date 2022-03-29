import {
  createDirectRelationship,
  IntegrationStepExecutionContext,
  RelationshipClass,
  Step,
} from '@jupiterone/integration-sdk-core';
import { CrowdStrikeIntegrationInstanceConfig } from '../types';
import createFalconAPIClient from '../crowdstrike/createFalconAPIClient';
import { Entities, Relationships, StepIds } from '../constants';
import { createVulnerabilityEntity } from '../jupiterone/converters';

const THIRTY_DAYS_AGO = 30 * 24 * 60 * 60 * 1000;

export async function fetchVulnerabilities(
  context: IntegrationStepExecutionContext<CrowdStrikeIntegrationInstanceConfig>,
): Promise<void> {
  const { instance, jobState, logger } = context;

  const client = createFalconAPIClient(instance.config, logger);
  const lastSuccessfulSyncTime =
    context.executionHistory.lastSuccessful?.startedOn;

  const thirtyDaysAgo = Date.now() - THIRTY_DAYS_AGO;

  const createdTimestampFilter = new Date(
    lastSuccessfulSyncTime ?? thirtyDaysAgo,
  ).toISOString();

  logger.info('Iterating vulnerabilities...');
  await client.iterateVulnerabilities({
    query: {
      filter: `created_timestamp:>'${createdTimestampFilter}'`,
    },
    callBack: async (vulns) => {
      logger.info(
        { vulnerabilityCount: vulns.length, createdTimestampFilter },
        'Creating vulnerability entities and relationships...',
      );
      for (const vulnerability of vulns) {
        const vulnerabilityEntity = await jobState.addEntity(
          createVulnerabilityEntity(vulnerability),
        );

        const sensor = await jobState.findEntity(vulnerability.aid);

        if (sensor) {
          await jobState.addRelationship(
            createDirectRelationship({
              from: vulnerabilityEntity,
              _class: RelationshipClass.EXPLOITS,
              to: sensor,
            }),
          );
        }
      }
    },
  });
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
