import fetch from "node-fetch";

import { DeviceIdentifier } from "./types";

export type OAuth2Token = {
  token: string;
  expiresAt: number;
};

export type FalconAPIClientConfig = {
  clientId: string;
  clientSecret: string;
};

export type FalconAPIResourceIterationCallback<T> = (
  resources: T[],
) => boolean | void | Promise<boolean | void>;

export class FalconAPIClient {
  public token: OAuth2Token | undefined;

  constructor(readonly config: FalconAPIClientConfig) {}

  public async authenticate(): Promise<OAuth2Token> {
    if (!this.token || !isValidToken(this.token)) {
      // eslint-disable-next-line require-atomic-updates
      this.token = await requestOAuth2Token(this.config);
    }
    return this.token;
  }

  public async iterateDevices(
    cb: FalconAPIResourceIterationCallback<DeviceIdentifier>,
  ): Promise<void> {
    await this.authenticate();
    await cb([]);
  }
}

async function requestOAuth2Token(
  config: FalconAPIClientConfig,
): Promise<OAuth2Token> {
  const params = new URLSearchParams();
  params.append("client_id", config.clientId);
  params.append("client_secret", config.clientSecret);

  const response = await fetch("https://api.crowdstrike.com/oauth2/token", {
    method: "POST",
    headers: {
      accept: "application/json",
    },
    body: params,
  });

  const responseJson = await response.json();
  if (response.status >= 400) {
    const err = new Error(
      `Failed to obtain access token: ${response.statusText}`,
    );
    Object.assign(err, { code: response.status });
    throw err;
  }

  return {
    token: responseJson.access_token,
    expiresAt: Date.now() + responseJson.expires_in,
  };
}

function isValidToken(access: OAuth2Token): boolean {
  return !!(access && access.expiresAt > Date.now());
}
