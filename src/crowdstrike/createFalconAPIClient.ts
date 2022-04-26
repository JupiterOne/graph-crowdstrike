import { IntegrationLogger } from '@jupiterone/integration-sdk-core';
import { CrowdStrikeIntegrationInstanceConfig } from '../types';
import { FalconAPIClient } from './FalconAPIClient';

let client: FalconAPIClient;

export default function createFalconAPIClient(
  config: CrowdStrikeIntegrationInstanceConfig,
  logger: IntegrationLogger,
): FalconAPIClient {
  if (!client) {
    client = new FalconAPIClient({
      credentials: config,
      logger,
    });
  }
  return client;
}
