import { IntegrationStepExecutionContext } from "@jupiterone/jupiter-managed-integration-sdk";
import { FalconAPIClient, ClientEvents } from "./FalconAPIClient";

export default function createFalconAPIClient(
  executionContext: IntegrationStepExecutionContext,
): FalconAPIClient {
  const { instance, logger } = executionContext;

  const falconAPI = new FalconAPIClient({
    credentials: instance.config,
  });

  falconAPI.events.on(ClientEvents.REQUEST, event => {
    console.log({ logger, event }, "logger");
    logger.trace(event, "Sending Falcon API request...");
  });

  return falconAPI;
}
