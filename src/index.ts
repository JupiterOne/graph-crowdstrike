import { IntegrationInvocationConfig } from "@jupiterone/jupiter-managed-integration-sdk";

import executionHandler from "./executionHandler";
import invocationValidator from "./invocationValidator";

const invocationConfig: IntegrationInvocationConfig = {
  executionHandler,
  invocationValidator,
};

export { invocationConfig };
