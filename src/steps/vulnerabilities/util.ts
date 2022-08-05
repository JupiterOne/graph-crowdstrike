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
  if (!lastSuccessfulRun) {
    return getDateInPast(maxDaysInPast);
  }

  const dateInPast = getDateInPast(maxDaysInPast);
  if (dateInPast.getTime() > lastSuccessfulRun) {
    return dateInPast;
  } else {
    return new Date(lastSuccessfulRun);
  }
}
