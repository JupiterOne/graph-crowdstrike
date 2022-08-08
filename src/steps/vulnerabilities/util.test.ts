import { getDateInPast } from '../util';
import { calculateCreatedFilterTime } from './util';

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
