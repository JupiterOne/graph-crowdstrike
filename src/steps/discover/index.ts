import { IntegrationStep } from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../../config';
import { fetchApplicationsStepMap } from './steps/fetch-applications';

export const discoverSteps: IntegrationStep<IntegrationConfig>[] = [
  fetchApplicationsStepMap,
];
