export type OAuth2ClientCredentials = {
  clientId: string;
  clientSecret: string;
};

export type OAuth2TokenResponse = {
  access_token: string;
  expires_in: number;
};

export type OAuth2Token = {
  token: string;
  expiresAt: number;
};

export type PaginationState = {
  /**
   * Fetch limit, will be URL encoded as value of `limit` GET parameter.
   */
  limit?: number;

  /**
   * Total number of objects reported in API response. The number is affected by
   * the filter, if any.
   */
  total?: number;

  /**
   * Fetch offset, a number to start from or a cursor, depending on API.
   */
  offset?: number | string;

  /**
   * Offset cursor expiration time, only present for cursor based API.
   */
  expiresAt?: number;

  /**
   * Number of resources returned through pagination to the point of offset.
   */
  seen: number;

  /**
   * Number of pages returned through pagination to the point of offset.
   */
  pages: number;

  /**
   * Pagination has completed according to provided pagination parameters.
   */
  finished: boolean;
};

export type PaginationParams = Partial<PaginationState>;

export type NumericOffsetPaginationParams = Omit<
  PaginationParams,
  "expiresAt"
> & {
  offset?: number;
};

export type NumericOffsetPaginationState = Omit<
  PaginationState,
  "expiresAt"
> & {
  offset?: number;
};

export type QueryParams = {
  filter?: string;
  [name: string]: string | undefined;
};

export type RateLimitConfig = {
  /**
   * The limit remaining value at which the client should slow down. This
   * prevents the client from consuming all available requests.
   */
  reserveLimit: number;

  /**
   * A recommended period of time in milliseconds to wait between requests when
   * the `reserveLimit` is reached.
   *
   * This can be a value representing the refill rate of a "leaky bucket" or
   * just a guess about how soon another request can be made. Ideally there will
   * be enough information in the response headers to calculate a better value.
   */
  cooldownPeriod: number;

  /**
   * Maximum number of times to retry a request that continues to receive 429
   * responses.
   *
   * The client will respect `x-ratelimit-retryafter`, but should it end up in a
   * battle to get the next allowed request, it will give up after this many
   * tries.
   */
  maxAttempts: number;
};

/**
 * The last seen values from rate limit response headers.
 */
export type RateLimitState = {
  /**
   * Maximum number of requests per minute that can be made by all API clients
   * in a customer account. Initial value assumes the published default of 100.
   */
  perMinuteLimit: number;

  /**
   * Number of requests that remain in the account's rate limiting pool. The
   * total number available is not known.
   */
  limitRemaining: number;

  /**
   * The next time when an account's rate limit pool will have at least one
   * request available.
   */
  retryAfter: number;
};

/**
 * Metadata in API responses indicating the pagination state.
 */
export type PaginationMeta = {
  limit: number;
  total: number;
  offset: number | string;
  expires_at?: number;
};

export type ResponseMeta = {
  trace_id: string;
  pagination?: PaginationMeta;
};

export type ResponseError = {
  code: number;
  message: string;
};

export type ResourcesResponse<T> = {
  meta: ResponseMeta;
  errors: ResponseError[];
  resources: T[];
};

/**
 * The identifier of a discovered device within the CrowdStrike Falcon platform.
 */
export type DeviceIdentifier = string;

export type Device = {
  device_id: DeviceIdentifier;
  first_seen: string;
  last_seen: string;
  [property: string]: string | boolean | object | Array<string | object>;
};

export type PreventionPolicyIdentifier = string;

export type PreventionPolicy = {
  id: PreventionPolicyIdentifier;
  created_by: string;
  created_timestamp: string;
  modified_by: string;
  modified_timestamp: string;
  [property: string]: string | boolean | object | Array<string | object>;
};
