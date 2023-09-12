import {
  executeStepWithDependencies,
  Recording,
} from '@jupiterone/integration-sdk-testing';

import { StepIds } from '../constants';
import { setupCrowdstrikeRecording } from '../../../test/recording';
import { buildStepTestConfig } from '../../../test/config';

describe(StepIds.DISCOVER_APPLICATIONS, () => {
  let recording: Recording;
  afterEach(async () => {
    if (recording) await recording.stop();
  });

  test(
    StepIds.DISCOVER_APPLICATIONS,
    async () => {
      recording = setupCrowdstrikeRecording({
        name: StepIds.DISCOVER_APPLICATIONS,
        directory: __dirname,
        options: {
          matchRequestsBy: {
            url: false,
          },
          recordFailedRequests: true,
        },
      });

      const stepConfig = buildStepTestConfig(StepIds.DISCOVER_APPLICATIONS);
      const result = await executeStepWithDependencies(stepConfig);

      expect(result).toMatchStepMetadata(stepConfig);
    },
    200_000,
  );
});
