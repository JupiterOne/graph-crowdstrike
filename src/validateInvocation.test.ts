import { IntegrationProviderAuthenticationError } from '@jupiterone/integration-sdk-core';
import { createMockExecutionContext } from '@jupiterone/integration-sdk-testing';
import {
  CrowdStrikeIntegrationInstanceConfig,
  validateInvocation,
} from './config';

describe('#validateInvocation', () => {
  test('all config params missing', async () => {
    const executionContext =
      createMockExecutionContext<CrowdStrikeIntegrationInstanceConfig>({
        instanceConfig: {} as CrowdStrikeIntegrationInstanceConfig,
      });

    await expect(validateInvocation(executionContext)).rejects.toThrow(
      'Config requires all of {clientId, clientSecret}',
    );
  });

  test('clientId missing', async () => {
    const executionContext =
      createMockExecutionContext<CrowdStrikeIntegrationInstanceConfig>({
        instanceConfig: {
          clientSecret: 'YYY',
        } as CrowdStrikeIntegrationInstanceConfig,
      });

    await expect(validateInvocation(executionContext)).rejects.toThrow(
      'Config requires all of {clientId, clientSecret}',
    );
  });

  test('clientSecret missing', async () => {
    const executionContext =
      createMockExecutionContext<CrowdStrikeIntegrationInstanceConfig>({
        instanceConfig: {
          clientId: 'XXX',
        } as CrowdStrikeIntegrationInstanceConfig,
      });

    await expect(validateInvocation(executionContext)).rejects.toThrow(
      'Config requires all of {clientId, clientSecret}',
    );
  });

  test.skip('auth error', async () => {
    const executionContext =
      createMockExecutionContext<CrowdStrikeIntegrationInstanceConfig>({
        instanceConfig: {
          clientId: 'XXX',
          clientSecret: 'YYY',
        },
      });

    try {
      await validateInvocation(executionContext);
    } catch (e) {
      expect(e.message).toEqual(
        'Provider authentication failed at https://api.crowdstrike.com/oauth2/token: failed auth error',
      );
      expect(e).toBeInstanceOf(IntegrationProviderAuthenticationError);
    }

    expect.assertions(2);
  });
});
