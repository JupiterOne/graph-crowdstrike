import { PaginationParams, QueryParams } from './types';

export interface ICrowdStrikeApiClientQueryBuilder {
  buildResourcePathUrl(
    availabilityZone: string | undefined,
    resourcePath: string,
    paginationParams?: PaginationParams,
    query?: QueryParams,
  ): string;
}

export class CrowdStrikeApiClientQueryBuilder
  implements ICrowdStrikeApiClientQueryBuilder
{
  private toQueryString(
    pagination?: {
      limit?: number;
      offset?: number | string;
      after?: number | string;
    },
    queryParams?: object,
  ): URLSearchParams {
    const params = new URLSearchParams();

    if (queryParams) {
      for (const e of Object.entries(queryParams)) {
        params.append(e[0], String(e[1]));
      }
    }

    if (pagination) {
      if (typeof pagination.limit === 'number') {
        params.set('limit', String(pagination.limit));
      }
      if (pagination.offset !== undefined) {
        params.set('offset', String(pagination.offset));
      }
      if (pagination.after !== undefined) {
        params.set('after', String(pagination.after));
      }
    }

    return params;
  }

  public buildResourcePathUrl(
    availabilityZone: string,
    resourcePath: string,
    paginationParams: PaginationParams | undefined = undefined,
    query?: QueryParams,
  ): string {
    return `https://api.${availabilityZone}crowdstrike.com${resourcePath}?${this.toQueryString(
      paginationParams,
      query,
    )}`;
  }
}
