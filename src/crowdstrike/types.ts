export type DeviceIdentifier = string;

export type OAuth2Access = {
  token: string;
  expiresAt: number;
};

export type FalconClientConfig = {
  clientId: string;
  clientSecret: string;
};

export interface FalconClient {
  authorize: () => Promise<OAuth2Access>;

  iterateDevices: (
    cb: (
      devices: DeviceIdentifier[],
    ) => boolean | void | Promise<boolean | void>,
  ) => Promise<void>;
}
