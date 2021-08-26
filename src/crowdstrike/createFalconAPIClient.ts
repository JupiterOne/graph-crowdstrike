import { IntegrationLogger } from "@jupiterone/integration-sdk-core";
import { CrowdStrikeIntegrationInstanceConfig } from "../types";
import { FalconAPIClient, ClientEvents } from "./FalconAPIClient";

export default function createFalconAPIClient(
  config: CrowdStrikeIntegrationInstanceConfig,
  logger: IntegrationLogger,
): FalconAPIClient {
  const falconAPI = new FalconAPIClient({
    credentials: config,
    logger,
  });

  falconAPI.events.on(ClientEvents.REQUEST, event => {
    console.log({ logger, event }, "logger");
    logger.trace(event, "Sending Falcon API request...");
  });

  return falconAPI;
}
