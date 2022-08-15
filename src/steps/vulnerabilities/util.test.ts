import { createMockExecutionContext } from '@jupiterone/integration-sdk-testing';
import { IntegrationConfig } from '../../config';
import { getDateInPast } from '../util';
import {
  calculateCreatedFilterTime,
  createVulnerabilityFQLFilter,
} from './util';

function mockDateNow() {
  return 1659689855416;
}

describe('calculateCreatedFilterTime', () => {
  let originalDateNow: () => number;
  beforeEach(() => {
    originalDateNow = Date.now;
    Date.now = mockDateNow;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  test('should return maxDaysInPast as Date if lastSuccessfulRun is undefined', () => {
    const data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (const d of data) {
      const expected = getDateInPast(d).getTime();
      const actual = calculateCreatedFilterTime({ maxDaysInPast: d }).getTime();
      expect(actual).toBe(expected);
    }
  });

  test('should never return a date greater than maxDaysInPast', () => {
    const daysInPast = 1;
    const expected = getDateInPast(daysInPast).getTime();
    const lastSuccessfulRuns = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (const runs of lastSuccessfulRuns) {
      const actual = calculateCreatedFilterTime({
        maxDaysInPast: daysInPast,
        lastSuccessfulRun: runs,
      }).getTime();
      expect(actual).toBeLessThanOrEqual(expected);
    }
  });

  test('should return lastSuccessfulRun if less than maxDaysInPast', () => {
    const lastSuccessfulRun = getDateInPast(9).getTime();
    const actual = calculateCreatedFilterTime({
      maxDaysInPast: 10,
      lastSuccessfulRun,
    }).getTime();
    expect(actual).toBe(lastSuccessfulRun);
  });
});

describe('#createVulnerabilityFQLFilter', () => {
  test('excludes closed vulnerabilities by default', () => {
    const { instance, executionHistory } =
      createMockExecutionContext<IntegrationConfig>({
        instanceConfig: {} as IntegrationConfig,
      });

    const actual = createVulnerabilityFQLFilter({
      config: instance.config,
      executionHistory,
      maxDaysInPast: 10,
    });
    expect(actual).toContain(`status:!'closed'`);
  });

  test('excludes closed vulnerabilities when includeClosedVulnerabilities is false', () => {
    const { instance, executionHistory } =
      createMockExecutionContext<IntegrationConfig>({
        instanceConfig: {
          includeClosedVulnerabilities: false,
        } as IntegrationConfig,
      });

    const actual = createVulnerabilityFQLFilter({
      config: instance.config,
      executionHistory,
      maxDaysInPast: 10,
    });
    expect(actual).toContain(`status:!'closed'`);
  });

  test('correctly formats vulnerability severities into FQL statement', () => {
    const { instance, executionHistory } =
      createMockExecutionContext<IntegrationConfig>({
        instanceConfig: {
          vulnerabilitySeverities: 'CRITICAL,HIGH,LOW',
        } as IntegrationConfig,
      });

    const actual = createVulnerabilityFQLFilter({
      config: instance.config,
      executionHistory,
      maxDaysInPast: 10,
    });

    expect(actual).toContain(`cve.severity:['CRITICAL','HIGH','LOW']`);
  });

  test('uses default filter when vulnerability severities is undefined', () => {
    const { instance, executionHistory } =
      createMockExecutionContext<IntegrationConfig>({
        instanceConfig: {
          vulnerabilitySeverities: undefined,
        } as IntegrationConfig,
      });

    const actual = createVulnerabilityFQLFilter({
      config: instance.config,
      executionHistory,
      maxDaysInPast: 10,
    });

    expect(actual).toContain(
      `cve.severity:['CRITICAL','HIGH','MEDIUM','LOW','NONE','UNKNOWN']`,
    );
  });

  test('uses default filter when vulnerability severities is empty string', () => {
    const { instance, executionHistory } =
      createMockExecutionContext<IntegrationConfig>({
        instanceConfig: {
          vulnerabilitySeverities: '',
        } as IntegrationConfig,
      });

    const actual = createVulnerabilityFQLFilter({
      config: instance.config,
      executionHistory,
      maxDaysInPast: 10,
    });

    expect(actual).toContain(
      `cve.severity:['CRITICAL','HIGH','MEDIUM','LOW','NONE','UNKNOWN']`,
    );
  });
});
