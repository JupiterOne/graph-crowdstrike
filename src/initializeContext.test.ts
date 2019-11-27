import { createTestIntegrationExecutionContext } from "@jupiterone/jupiter-managed-integration-sdk";
import initializeContext from "./initializeContext";

test("creates provider client", () => {
  const executionContext = createTestIntegrationExecutionContext();
  const integrationContext = initializeContext(executionContext);
  expect(integrationContext.provider).toBeDefined();
});
