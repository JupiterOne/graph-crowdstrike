import { getDateInPast } from '../util';

type CreateFilterTimeParams = {
  maxDaysInPast: number;
  lastSuccessfulRun?: number;
};

export function createCreatedTimestampFilter({
  maxDaysInPast,
  lastSuccessfulRun,
}: CreateFilterTimeParams): string {
  const filterTime = calculateFilterTime({
    maxDaysInPast,
    lastSuccessfulRun,
  }).toISOString();

  return filterTime;
}

export function calculateFilterTime({
  maxDaysInPast,
  lastSuccessfulRun,
}: CreateFilterTimeParams): Date {
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
