import { IntegrationInvocationConfig } from '@jupiterone/integration-sdk-core';
import {
  IntegrationConfig,
  instanceConfigFields,
  validateInvocation,
} from './config';
import { integrationSteps } from './steps';

export const invocationConfig: IntegrationInvocationConfig<IntegrationConfig> =
  {
    instanceConfigFields,
    validateInvocation,
    integrationSteps,
  };
