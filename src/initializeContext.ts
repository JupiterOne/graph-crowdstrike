import { IntegrationExecutionContext } from "@jupiterone/jupiter-managed-integration-sdk";
import ProviderClient from "./ProviderClient";
import { ExampleExecutionContext } from "./types";

export default function initializeContext(
  context: IntegrationExecutionContext,
): ExampleExecutionContext {
  return {
    ...context,
    ...context.clients.getClients(),
    provider: new ProviderClient(),
  };
}
