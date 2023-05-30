import {
  Recording,
  executeStepWithDependencies,
} from '@jupiterone/integration-sdk-testing';
import { setupCrowdstrikeRecording } from '../../../test/recording';
import { StepIds } from '../constants';
import { buildStepTestConfig } from '../../../test/config';
import { resetFalconAPIClient } from '../../crowdstrike/getOrCreateFalconAPIClient';

describe('fetchZeroTrustAssessment', () => {
  let recording: Recording;
  afterEach(async () => {
    if (recording) {
      await recording.stop();
    }
  });
  test('should fetch ZTA', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: StepIds.ZERO_TRUST_ASSESSMENT,
      options: {
        matchRequestsBy: {
          url: false,
        },
      },
    });

    const stepConfig = buildStepTestConfig(StepIds.ZERO_TRUST_ASSESSMENT);
    const stepResults = await executeStepWithDependencies(stepConfig);
    expect(stepResults).toMatchStepMetadata(stepConfig);
  }, 100_000);

  test('should fetch ZTA Sensor relationship', async () => {
    resetFalconAPIClient();
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: StepIds.ZERO_TRUST_ASSESSMENT_SENSOR_RELATIONSHIPS,
      options: {
        matchRequestsBy: {
          url: false,
        },
      },
    });

    const stepConfig = buildStepTestConfig(
      StepIds.ZERO_TRUST_ASSESSMENT_SENSOR_RELATIONSHIPS,
    );
    const stepResults = await executeStepWithDependencies(stepConfig);
    expect(stepResults).toMatchStepMetadata(stepConfig);
  }, 100_000);
});
