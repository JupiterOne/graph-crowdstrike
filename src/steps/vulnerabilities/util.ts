import { getDateInPast } from '../util';

type CalculateCreatedFilterTimeParams = {
  maxDaysInPast: number;
  lastSuccessfulRun?: number;
};

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
