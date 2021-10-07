import { IntegrationLogger } from '@jupiterone/integration-sdk-core';
import { CrowdStrikeIntegrationInstanceConfig } from '../types';
import { FalconAPIClient } from './FalconAPIClient';

export default function createFalconAPIClient(
  config: CrowdStrikeIntegrationInstanceConfig,
  logger: IntegrationLogger,
): FalconAPIClient {
  return new FalconAPIClient({
    credentials: config,
    logger,
  });
}
