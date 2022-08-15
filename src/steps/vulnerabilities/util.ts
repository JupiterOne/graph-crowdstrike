import { ExecutionHistory } from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../../config';
import { createFQLTimestamp, getDateInPast } from '../util';

type CalculateCreatedFilterTimeParams = {
  maxDaysInPast: number;
  lastSuccessfulRun?: number;
};

/**
 * calculateCreatedFilterTime calculates the Date to use to filter
 * based on the last successful run and a maximum number of days in the past.
 */
export function calculateCreatedFilterTime({
  maxDaysInPast,
  lastSuccessfulRun,
}: CalculateCreatedFilterTimeParams): Date {
  const maxDateInPast = getDateInPast(maxDaysInPast);
  if (!lastSuccessfulRun) {
    return maxDateInPast;
  }

  if (maxDateInPast.getTime() > lastSuccessfulRun) {
    return maxDateInPast;
  } else {
    return new Date(lastSuccessfulRun);
  }
}

type CreateVulnerabilityFQLFilterParams = {
  maxDaysInPast: number;
  config: IntegrationConfig;
  executionHistory: ExecutionHistory;
};

/**
 * createVulnerabilityFQLFilter creates a Falcon Query Language filter used to
 * filter results from CrowdStrike's spotlight vulnerabilities endpoint
 */
export function createVulnerabilityFQLFilter({
  config,
  executionHistory,
  maxDaysInPast,
}: CreateVulnerabilityFQLFilterParams): string {
  const createdTimestampFilter = createFQLTimestamp(
    calculateCreatedFilterTime({
      lastSuccessfulRun: executionHistory.lastSuccessful?.startedOn,
      maxDaysInPast: maxDaysInPast,
    }),
  );

  let filter = `created_timestamp:>'${createdTimestampFilter}'`;
  if (!config.includeClosedVulnerabilities) {
    filter += `+status:!'closed'`;
  }

  filter += createSeverityFilter(config.vulnerabilitySeverities);
  return filter;
}

// TODO @zemberdotnet reset to lower default after two weeks
const DEFAULT_FILTER = `+cve.severity:['CRITICAL','HIGH','MEDIUM','LOW','NONE','UNKNOWN']`;
function createSeverityFilter(severities: string | undefined) {
  if (!severities) {
    return DEFAULT_FILTER;
  }

  const sevFilters = severities.split(',').map((v) => `'${v}'`);
  return `+cve.severity:[${sevFilters}]`;
}
