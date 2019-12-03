import { Polly } from "@pollyjs/core";

import polly from "../../test/helpers/polly";
import config from "../../test/integrationInstanceConfig";

import { FalconAPIClient } from "./FalconAPIClient";

let p: Polly;

afterEach(async () => {
  await p.stop();
});

describe("authenticate", () => {
  test("obtains token and expiration", async () => {
    p = polly(__dirname, "authenticate");

    let requests = 0;
    p.server.any().on("request", (_req, _event) => {
      requests++;
    });

    const client = new FalconAPIClient(config);
    await expect(client.authenticate()).resolves.toEqual({
      token: expect.any(String),
      expiresAt: expect.any(Number),
    });

    expect(requests).toEqual(1);
  });

  test("answers cached token before expiration", async () => {
    p = polly(__dirname, "authenticateCached");

    let requests = 0;
    p.server.any().on("request", (_req, _event) => {
      requests++;
    });

    const client = new FalconAPIClient(config);
    const access = await client.authenticate();
    await expect(client.authenticate()).resolves.toBe(access);

    expect(requests).toEqual(1);
  });

  test("answers new token after expiration", async () => {
    p = polly(__dirname, "authenticateRefresh");

    let requests = 0;
    p.server.any().on("request", (_req, _event) => {
      requests++;
    });

    const client = new FalconAPIClient(config);
    const access = await client.authenticate();

    const realNow = Date.now; // eslint-disable-line @typescript-eslint/unbound-method
    jest
      .spyOn(global.Date, "now")
      .mockImplementationOnce(() => realNow() + 30 * 60 * 1000);

    const newAccess = await client.authenticate();
    expect(newAccess).not.toBe(access);
    expect(newAccess).toEqual({
      token: expect.any(String),
      expiresAt: expect.any(Number),
    });

    expect(requests).toEqual(2);
  });

  test("throws errors", async () => {
    p = polly(__dirname, "authenticateError", { recordFailedRequests: true });
    const client = new FalconAPIClient({
      ...config,
      clientSecret: "test-error-handling",
    });
    try {
      await client.authenticate();
    } catch (err) {
      expect(err.code).toEqual(403);
      expect(err.message).toMatch(/Forbidden/);
    }
    expect.assertions(2);
  });
});

describe("iterateDevices", () => {
  test("authenticates if necessary", async () => {
    p = polly(__dirname, "iterateDevices");

    p.server.any().intercept((req, res) => {
      // eslint-disable-next-line @typescript-eslint/camelcase
      res.status(201).json({ access_token: "token", expires_in: 10000 });
    });

    const client = new FalconAPIClient(config);
    const cbSpy = jest.fn().mockResolvedValue(false);

    await client.iterateDevices(cbSpy);
    expect(cbSpy).toBeCalledTimes(1);
  });
});
