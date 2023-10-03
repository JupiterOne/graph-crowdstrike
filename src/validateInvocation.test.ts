import {
  IntegrationProviderAuthenticationError,
  IntegrationValidationError,
} from '@jupiterone/integration-sdk-core';
import { createMockExecutionContext } from '@jupiterone/integration-sdk-testing';
import { IntegrationConfig, validateInvocation } from './config';
import { Recording, setupCrowdstrikeRecording } from '../test/recording';
import { config } from '../test/config';

let recording: Recording;

afterEach(async () => {
  if (recording) {
    await recording.stop();
  }
});

describe('#validateInvocation', () => {
  test('all config params missing', async () => {
    const executionContext = createMockExecutionContext<IntegrationConfig>({
      instanceConfig: {} as IntegrationConfig,
    });

    await expect(validateInvocation(executionContext)).rejects.toThrow(
      'Config requires all of {clientId, clientSecret}',
    );
  });

  test('clientId missing', async () => {
    const executionContext = createMockExecutionContext<IntegrationConfig>({
      instanceConfig: {
        clientSecret: 'YYY',
      } as IntegrationConfig,
    });

    await expect(validateInvocation(executionContext)).rejects.toThrow(
      'Config requires all of {clientId, clientSecret}',
    );
  });

  test('clientSecret missing', async () => {
    const executionContext = createMockExecutionContext<IntegrationConfig>({
      instanceConfig: {
        clientId: 'XXX',
      } as IntegrationConfig,
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

    const executionContext = createMockExecutionContext<IntegrationConfig>({
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

    const executionContext = createMockExecutionContext<IntegrationConfig>({
      instanceConfig: {
        clientId: 'not-valid',
        clientSecret: 'not-valid-secret',
      } as IntegrationConfig,
    });

    await expect(validateInvocation(executionContext)).rejects.toBeInstanceOf(
      IntegrationValidationError,
    );
  });

  test('fails to validate vulnerabilitySeverities contains invalid severity', async () => {
    const executionContext = createMockExecutionContext<IntegrationConfig>({
      instanceConfig: {
        ...config,
        vulnerabilitySeverities: 'CRITICAL,NOTGOOD',
      },
    });

    await expect(validateInvocation(executionContext)).rejects.toThrow(
      'Severity - NOTGOOD - is not valid. Valid vulnerability severities include CRITICAL,HIGH,MEDIUM,LOW,NONE,UNKNOWN',
    );
  });

  test('fails to validate vulnerabilitiesMaxDaysInPast contains invalid number', async () => {
    const executionContext = createMockExecutionContext<IntegrationConfig>({
      instanceConfig: {
        ...config,
        vulnerabilitiesMaxDaysInPast: '-1',
      },
    });

    await expect(validateInvocation(executionContext)).rejects.toThrow(
      `Invalid vulnerabilitiesMaxDaysInPast: "-1"`,
    );
  });

  test('fails to validate vulnerabilitiesMaxDaysInPast is not a number', async () => {
    const executionContext = createMockExecutionContext<IntegrationConfig>({
      instanceConfig: {
        ...config,
        vulnerabilitiesMaxDaysInPast: 'I am not a number im just text',
      },
    });

    await expect(validateInvocation(executionContext)).rejects.toThrow(
      `Invalid vulnerabilitiesMaxDaysInPast: "I am not a number im just text"`,
    );
  });

  test('fails to validate sensorsMaxDaysInPast contains invalid number', async () => {
    const executionContext = createMockExecutionContext<IntegrationConfig>({
      instanceConfig: {
        ...config,
        sensorsMaxDaysInPast: '-1',
      },
    });

    await expect(validateInvocation(executionContext)).rejects.toThrow(
      `Invalid sensorsMaxDaysInPast: "-1"`,
    );
  });

  test('fails to validate sensorsMaxDaysInPast is not a number', async () => {
    const executionContext = createMockExecutionContext<IntegrationConfig>({
      instanceConfig: {
        ...config,
        sensorsMaxDaysInPast: 'I am not a number im just text',
      },
    });

    await expect(validateInvocation(executionContext)).rejects.toThrow(
      `Invalid sensorsMaxDaysInPast: "I am not a number im just text"`,
    );
  });
});
