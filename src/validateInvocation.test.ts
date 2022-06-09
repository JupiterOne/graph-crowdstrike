import {
  IntegrationProviderAuthenticationError,
  IntegrationValidationError,
} from '@jupiterone/integration-sdk-core';
import { createMockExecutionContext } from '@jupiterone/integration-sdk-testing';
import {
  CrowdStrikeIntegrationInstanceConfig,
  validateInvocation,
} from './config';
import {
  Recording,
  setupCrowdstrikeRecording,
} from '../test/helpers/recording';
import { config } from '../test/integrationInstanceConfig';

let recording: Recording;

afterEach(async () => {
  if (recording) {
    await recording.stop();
  }
});

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

  test('auth error', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'validateInvocationAuthError',
      options: {
        recordFailedRequests: true,
      },
    });

    const executionContext =
      createMockExecutionContext<CrowdStrikeIntegrationInstanceConfig>({
        instanceConfig: {
          ...config,
          clientSecret: 'not-valid-secret',
        },
      });

    await expect(validateInvocation(executionContext)).rejects.toBeInstanceOf(
      IntegrationProviderAuthenticationError,
    );
  });

  test('auth bad request', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'validateInvocationAuthBadRequestError',
      options: {
        recordFailedRequests: true,
      },
    });

    const executionContext =
      createMockExecutionContext<CrowdStrikeIntegrationInstanceConfig>({
        instanceConfig: {
          clientId: 'not-valid',
          clientSecret: 'not-valid-secret',
        },
      });

    await expect(validateInvocation(executionContext)).rejects.toBeInstanceOf(
      IntegrationValidationError,
    );
  });
});
