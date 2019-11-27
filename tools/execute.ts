/* tslint:disable:no-console */
import { executeIntegrationLocal } from "@jupiterone/jupiter-managed-integration-sdk";
import { invocationConfig } from "../src/index";

const integrationConfig = {
  // providerApiToken: process.env.PROVIDER_LOCAL_EXECUTION_API_TOKEN
};

const invocationArgs = {
  // providerPrivateKey: process.env.PROVIDER_LOCAL_EXECUTION_PRIVATE_KEY
};

executeIntegrationLocal(
  integrationConfig,
  invocationConfig,
  invocationArgs,
).catch(err => {
  console.error(err);
  process.stdout.end(() => {
    process.exit(1);
  });
});
