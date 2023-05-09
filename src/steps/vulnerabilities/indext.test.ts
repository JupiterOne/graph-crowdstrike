import {
  executeStepWithDependencies,
  Recording,
} from '@jupiterone/integration-sdk-testing';

import { StepIds } from '../constants';
import { setupCrowdstrikeRecording } from '../../../test/recording';
import { buildStepTestConfig } from '../../../test/config';

describe(`vulnerabilities#${StepIds.VULN_EXPLOITS_SENSOR}`, () => {
  let recording: Recording;
  afterEach(async () => {
    if (recording) await recording.stop();
  });

  jest.setTimeout(45000);

  test(StepIds.VULN_EXPLOITS_SENSOR, async () => {
    recording = setupCrowdstrikeRecording({
      name: StepIds.VULN_EXPLOITS_SENSOR,
      directory: __dirname,
    });

    const stepConfig = buildStepTestConfig(StepIds.VULN_EXPLOITS_SENSOR);

    const result = await executeStepWithDependencies(stepConfig);
    expect(result).toMatchStepMetadata(stepConfig);
  });
});
