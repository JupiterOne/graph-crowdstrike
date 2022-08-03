import { IntegrationLogger } from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../config';
import { FalconAPIClient } from './FalconAPIClient';

let client: FalconAPIClient;

export default function getOrCreateFalconAPIClient(
  config: IntegrationConfig,
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
