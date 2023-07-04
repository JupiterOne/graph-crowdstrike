import { FalconApiClientQueryBuilder } from './FalconApiClientQueryBuilder';

describe('FalconApiClientQueryBuilder', () => {
  describe('buildResourcePathUrl()', () => {
    describe('given a resource path', () => {
      it('should build a valid URL', () => {
        const queryBuilder = new FalconApiClientQueryBuilder();
        const result = queryBuilder.buildResourcePathUrl(
          '',
          '/zero-trust-assessment/queries/assessments/v1',
          { limit: 25 },
          { filter: 'score' },
        );

        expect(result).toEqual(
          'https://api.crowdstrike.com/zero-trust-assessment/queries/assessments/v1?filter=score&limit=25',
        );
      });
    });
  });
});
