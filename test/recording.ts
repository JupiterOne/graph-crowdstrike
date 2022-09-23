import {
  Entity,
  IntegrationInstanceConfig,
  IntegrationInvocationConfig,
  Relationship,
} from '@jupiterone/integration-sdk-core';
import {
  Recording,
  setupRecording,
  SetupRecordingInput,
  mutations,
  StepTestConfig,
  executeStepWithDependencies,
} from '@jupiterone/integration-sdk-testing';

export { Recording };

export function setupCrowdstrikeRecording(options: SetupRecordingInput) {
  return setupRecording({
    ...options,
    mutateEntry: (entry) => {
      mutations.unzipGzippedRecordingEntry(entry);

      if (/oauth2\/token/.exec(entry.request.url) && entry.request.postData) {
        // Redact request body with secrets for authentication
        entry.request.postData.text = '[REDACTED]';

        // Redact authentication response token
        const responseText = entry.response.content.text;
        const responseJson = responseText && JSON.parse(responseText);
        if (responseJson.access_token) {
          entry.response.content.text = JSON.stringify(
            {
              ...responseJson,
              access_token: '[REDACTED]',
            },
            null,
            0,
          );
        }
      }
    },
  });
}

export type WithRecordingParams = SetupRecordingInput;

export async function withRecording(
  withRecordingParams: WithRecordingParams,
  cb: () => Promise<void>,
) {
  const recording = setupCrowdstrikeRecording(withRecordingParams);

  try {
    await cb();
  } finally {
    await recording.stop();
  }
}

type AfterStepCollectionExecutionParams = {
  stepConfig: StepTestConfig<
    IntegrationInvocationConfig<IntegrationInstanceConfig>,
    IntegrationInstanceConfig
  >;
  stepResult: {
    collectedEntities: Entity[];
    collectedRelationships: Relationship[];
    collectedData: {
      [key: string]: any;
    };
    encounteredTypes: string[];
  };
};

type CreateStepCollectionTestParams = {
  recordingSetup: WithRecordingParams;
  stepConfig: StepTestConfig;
  afterExecute?: (params: AfterStepCollectionExecutionParams) => Promise<void>;
};

export function createStepCollectionTest({
  recordingSetup,
  stepConfig,
  afterExecute,
}: CreateStepCollectionTestParams) {
  return async () => {
    await withRecording(recordingSetup, async () => {
      const stepResult = await executeStepWithDependencies(stepConfig);

      expect(stepResult).toMatchStepMetadata(stepConfig);

      if (afterExecute) await afterExecute({ stepResult, stepConfig });
    });
  };
}
