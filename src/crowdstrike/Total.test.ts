import { Total } from './Total';

describe('Total', () => {
  describe('given an initial value and then undefined', () => {
    describe('when they try to get the value', () => {
      it('should return the initial value', () => {
        const totalCache = new Total();

        totalCache.setValue('https://url.com', 10);
        totalCache.setValue('https://url.com', undefined);

        const result = totalCache.getValue('https://url.com');

        expect(result).toBe(10);
      });
    });
  });

  describe('given an initial value and then another value', () => {
    describe('when they try to get the value', () => {
      it('should return the initial value', () => {
        const totalCache = new Total();

        totalCache.setValue('https://url.com', 10);
        totalCache.setValue('https://url.com', 20);

        const result = totalCache.getValue('https://url.com');

        expect(result).toBe(10);
      });
    });
  });
});
