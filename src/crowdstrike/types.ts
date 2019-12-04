export type OAuth2TokenResponse = {
  access_token: string;
  expires_in: number;
};

/**
 * The identifier of a discovered device within the CrowdStrike Falcon platform.
 */
export type DeviceIdentifier = string;
