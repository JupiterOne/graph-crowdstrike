import { IntegrationLogger } from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../config';
import { FalconAPIClient } from './FalconAPIClient';
import { FalconApiClientQueryBuilder } from './FalconApiClientQueryBuilder';
import { CrowdStrikeApiGateway } from './CrowdStrikeApiGateway';

let client: FalconAPIClient | undefined;

export default function getOrCreateFalconAPIClient(
  config: IntegrationConfig,
  logger: IntegrationLogger,
): FalconAPIClient {
  if (!client) {
    client = new FalconAPIClient({
      logger,
      crowdStrikeApiGateway: new CrowdStrikeApiGateway(
        config,
        logger,
        new FalconApiClientQueryBuilder(),
      ),
    });
  }
  return client;
}

export function resetFalconAPIClient() {
  client = undefined;
}
