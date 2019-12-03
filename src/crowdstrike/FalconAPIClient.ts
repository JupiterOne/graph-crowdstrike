import fetch, { Response } from "node-fetch";

import { DeviceIdentifier } from "./types";
import Timeout from "await-timeout";

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

export type FetchRequest = () => Promise<Response>;

export type RequestOptions = {
  tryAfter?: number;
};

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

async function makeRequest<T>(request: FetchRequest): Promise<Response> {
  const maxAttempts = 5;
  let attempts = 0;
  let tryAfter = Date.now();
  do {
    const response = await tryMakeRequest(request, { tryAfter });
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("x-ratelimit-retryafter");
      tryAfter = Number(retryAfterHeader);
    } else {
      return response;
    }
    attempts += 1;
  } while (attempts < maxAttempts);

  throw new Error(`Could not complete request, attempted: ${attempts}!`);
}

async function tryMakeRequest(
  request: FetchRequest,
  options: RequestOptions,
): Promise<Response> {
  const now = Date.now();
  if (options.tryAfter && options.tryAfter > now) {
    await Timeout.set(options.tryAfter - now);
  }
  return request();
}

async function requestOAuth2Token(
  config: FalconAPIClientConfig,
): Promise<OAuth2Token> {
  const params = new URLSearchParams();
  params.append("client_id", config.clientId);
  params.append("client_secret", config.clientSecret);

  const response = await makeRequest(() => {
    return fetch("https://api.crowdstrike.com/oauth2/token", {
      method: "POST",
      headers: {
        accept: "application/json",
      },
      body: params,
    });
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
