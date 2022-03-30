import getStepStartStates from './getStepStartStates';

describe('getStepStartStates', () => {
  test('it returns correct disabled values', () => {
    const executionContext = {
      instance: {
        config: {
          enableFetchVulnerabilitiesStep: true,
        },
      },
    };

    expect(getStepStartStates(executionContext as any)).toMatchSnapshot();

    const executionContext2 = {
      instance: {
        config: {},
      },
    };
    expect(getStepStartStates(executionContext2 as any)).toMatchSnapshot();
  });
});
