import { IntegrationExecutionContext } from '@jupiterone/integration-sdk-core';
import { CrowdStrikeIntegrationInstanceConfig } from './types';

/**
 * Performs validation of the execution before the execution handler function is
 * invoked.
 *
 * At a minimum, integrations should ensure that the
 * `context.instance.config` is valid. Integrations that require
 * additional information in `context.invocationArgs` should also
 * validate those properties. It is also helpful to perform authentication with
 * the provider to ensure that credentials are valid.
 *
 * The function will be awaited to support connecting to the provider for this
 * purpose.
 *
 * @param context
 */
export default async function invocationValidator(
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _context: IntegrationExecutionContext<CrowdStrikeIntegrationInstanceConfig>,
): Promise<void> {
  // const { config } = context.instance;
  // if (!config.providerAPIKey) {
  //   throw new IntegrationInstanceConfigError('providerAPIKey missing in config');
  // }
  // try {
  //   new ProviderClient(config.providerAPIKey).someEndpoint();
  // } catch (err) {
  //   throw new IntegrationInstanceAuthenticationError(err);
  // }
}
