import invocationValidator from './invocationValidator';

test('should do nothing in example', async () => {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  await invocationValidator({} as any);
});
