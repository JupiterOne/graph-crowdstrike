import fetch from "node-fetch";
import { URLSearchParams } from "url";

import { FalconClient, FalconClientConfig, OAuth2Access } from "./types";

export default function createClient(config: FalconClientConfig): FalconClient {
  let access: OAuth2Access | undefined;

  const requestOAuth2Access = async (): Promise<OAuth2Access> => {
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
  };

  const authorize = async (): Promise<OAuth2Access> => {
    if (!access || !isAuthorized()) {
      access = await requestOAuth2Access(); // eslint-disable-line require-atomic-updates
    }
    return access;
  };

  const isAuthorized = (): boolean => {
    return !!(access && access.expiresAt > Date.now());
  };

  return {
    authorize,

    iterateDevices: async (cb): Promise<void> => {
      await authorize();
      await cb([]);
    },
  };
}
