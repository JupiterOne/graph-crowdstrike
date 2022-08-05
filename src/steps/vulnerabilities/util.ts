import { getDateInPast } from '../util';

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
