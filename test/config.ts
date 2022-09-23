import * as dotenv from 'dotenv';
import { IntegrationConfig } from '../src/config';
import path from 'path';
import { StepTestConfig } from '@jupiterone/integration-sdk-testing';
import { invocationConfig } from '../src';
import { IntegrationInvocationConfig } from '@jupiterone/integration-sdk-core';

if (process.env.LOAD_ENV) {
  dotenv.config({
    path: path.join(__dirname, '../.env'),
  });
}

export const config: IntegrationConfig = {
  clientId: process.env.CLIENT_ID || 'clientId',
  clientSecret: process.env.CLIENT_SECRET || 'clientSecret',
};

export const availabilityZoneConfig: IntegrationConfig = {
  clientId: process.env.CLIENT_ID || 'clientId',
  clientSecret: process.env.CLIENT_SECRET || 'clientSecret',
  availabilityZone: 'availabilityTestZone',
};

export function buildStepTestConfigForAPIKey(stepId: string): StepTestConfig {
  return {
    stepId,
    instanceConfig: config,
    invocationConfig: invocationConfig as IntegrationInvocationConfig,
  };
}
