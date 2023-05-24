import {
  IntegrationStep,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../../config';
import { Entities, StepIds } from '../constants';
import getOrCreateFalconAPIClient from '../../crowdstrike/getOrCreateFalconAPIClient';
import { createZeroTrustAssessmentEntity } from '../../jupiterone/converters';

async function fetchZeroTrustAssessments({
  instance,
  jobState,
  logger,
  executionHistory,
}: IntegrationStepExecutionContext<IntegrationConfig>): Promise<void> {
  const client = getOrCreateFalconAPIClient(instance.config, logger);
  await client.iterateZeroTrustAssessment({
    query: {
      limit: '250',
      filter: 'score:<=100', // Score is the only filter possible. We must include a filter. Score is between [0,100]
    },
    callback: async (zeroTrustAssessments) => {
      for (const zta of zeroTrustAssessments) {
        await jobState.addEntity(createZeroTrustAssessmentEntity(zta));
      }
    },
  });
}
export const ZTASteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: StepIds.ZERO_TRUST_ASSESSMENT,
    name: 'Fetch Zero Trust Assessments',
    entities: [Entities.ZERO_TRUST_ASSESSMENT],
    relationships: [],
    dependsOn: [],
    executionHandler: fetchZeroTrustAssessments,
  },
];
