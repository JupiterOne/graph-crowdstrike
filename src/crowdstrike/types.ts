export type OAuth2TokenResponse = {
  access_token: string;
  expires_in: number;
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
