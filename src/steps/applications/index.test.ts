import {
  executeStepWithDependencies,
  Recording,
} from '@jupiterone/integration-sdk-testing';

import { StepIds } from '../constants';
import { setupCrowdstrikeRecording } from '../../../test/recording';
import { buildStepTestConfig } from '../../../test/config';

describe(`vulnerabilities#${StepIds.APPLICATIONS}`, () => {
  let recording: Recording;
  afterEach(async () => {
    if (recording) await recording.stop();
  });

  test(
    StepIds.APPLICATIONS,
    async () => {
      recording = setupCrowdstrikeRecording({
        name: StepIds.APPLICATIONS,
        directory: __dirname,
        options: {
          matchRequestsBy: {
            url: false,
          },
          recordFailedRequests: true,
        },
      });

      const stepConfig = buildStepTestConfig(StepIds.APPLICATIONS);
      const result = await executeStepWithDependencies(stepConfig);

      expect(result).toMatchStepMetadata(stepConfig);
    },
    100_000,
  );
});
