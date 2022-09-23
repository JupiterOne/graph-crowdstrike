import { executeStepWithDependencies } from '@jupiterone/integration-sdk-testing';
import { buildStepTestConfigForAPIKey } from '../../../test/config';
import { Recording, setupCrowdstrikeRecording } from '../../../test/recording';
import { StepIds } from '../constants';

describe('fetchDevices', () => {
  let recording: Recording;
  afterEach(async () => {
    if (recording) {
      await recording.stop();
    }
  });
  test.skip('should fetch devices and create entities and relationships', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'fetchDevices',
    });

    const stepConfig = buildStepTestConfigForAPIKey(StepIds.DEVICES);
    const stepResults = await executeStepWithDependencies(stepConfig);
    expect(stepResults).toMatchStepMetadata(stepConfig);
  });
});
