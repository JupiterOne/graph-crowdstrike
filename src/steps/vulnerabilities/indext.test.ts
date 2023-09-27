import {
  executeStepWithDependencies,
  filterGraphObjects,
  Recording,
} from '@jupiterone/integration-sdk-testing';

import { MappedRelationships, StepIds } from '../constants';
import { setupCrowdstrikeRecording } from '../../../test/recording';
import { buildStepTestConfig } from '../../../test/config';
import { resetFalconAPIClient } from '../../crowdstrike/getOrCreateFalconAPIClient';

describe(`vulnerabilities`, () => {
  let recording: Recording;
  afterEach(async () => {
    if (recording) await recording.stop();
  });

  jest.setTimeout(45000);

  test(StepIds.VULN_EXPLOITS_SENSOR, async () => {
    recording = setupCrowdstrikeRecording({
      name: StepIds.VULN_EXPLOITS_SENSOR,
      directory: __dirname,
      options: {
        matchRequestsBy: {
          url: false,
        },
      },
    });

    const stepConfig = buildStepTestConfig(StepIds.VULN_EXPLOITS_SENSOR);

    const result = await executeStepWithDependencies(stepConfig);

    expect(result).toMatchStepMetadata(stepConfig);
  });
});

describe(`vulnerability_is_cve#${StepIds.BUILD_VULNERABILITY_FINDING_CVE_RELATIONSHIPS}`, () => {
  let recording: Recording;
  afterEach(async () => {
    if (recording) await recording.stop();
  });

  jest.setTimeout(45000);

  test(StepIds.BUILD_VULNERABILITY_FINDING_CVE_RELATIONSHIPS, async () => {
    resetFalconAPIClient();
    recording = setupCrowdstrikeRecording({
      name: StepIds.BUILD_VULNERABILITY_FINDING_CVE_RELATIONSHIPS,
      directory: __dirname,
      options: {
        matchRequestsBy: {
          url: false,
        },
      },
    });

    const stepConfig = buildStepTestConfig(
      StepIds.BUILD_VULNERABILITY_FINDING_CVE_RELATIONSHIPS,
    );

    const { collectedRelationships } = await executeStepWithDependencies(
      stepConfig,
    );

    const { targets: mappedRelationships, rest } = filterGraphObjects(
      collectedRelationships,
      (r) => r._type === MappedRelationships.VULN_IS_CVE._type,
    );
    expect(mappedRelationships.length).toBeGreaterThan(0);
    expect(rest.length).toBe(0);
  });
});
