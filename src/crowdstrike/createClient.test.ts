import { Polly } from "@pollyjs/core";

import polly from "../../test/helpers/polly";
import config from "../../test/integrationInstanceConfig";
import createClient from "./createClient";

let p: Polly;

afterEach(async () => {
  await p.stop();
});

describe("authorize", () => {
  test("obtains token and expiration", async () => {
    p = polly(__dirname, "authorize");

    let requests = 0;
    p.server.any().on("request", (_req, _event) => {
      requests++;
    });

    const client = createClient(config);
    await expect(client.authorize()).resolves.toEqual({
      token: expect.any(String),
      expiresAt: expect.any(Number),
    });

    expect(requests).toEqual(1);
  });

  test("answers cached token before expiration", async () => {
    p = polly(__dirname, "authorizeCached");

    let requests = 0;
    p.server.any().on("request", (_req, _event) => {
      requests++;
    });

    const client = createClient(config);
    const access = await client.authorize();
    await expect(client.authorize()).resolves.toBe(access);

    expect(requests).toEqual(1);
  });

  test("answers new token after expiration", async () => {
    p = polly(__dirname, "authorizeRefresh");

    let requests = 0;
    p.server.any().on("request", (_req, _event) => {
      requests++;
    });

    const client = createClient(config);
    const access = await client.authorize();

    const realNow = Date.now; // eslint-disable-line @typescript-eslint/unbound-method
    jest
      .spyOn(global.Date, "now")
      .mockImplementationOnce(() => realNow() + 30 * 60 * 1000);

    const newAccess = await client.authorize();
    expect(newAccess).not.toBe(access);
    expect(newAccess).toEqual({
      token: expect.any(String),
      expiresAt: expect.any(Number),
    });

    expect(requests).toEqual(2);
  });

  test("throws errors", async () => {
    p = polly(__dirname, "authorizeError", { recordFailedRequests: true });
    const client = createClient({
      ...config,
      clientSecret: "test-error-handling",
    });
    try {
      await client.authorize();
    } catch (err) {
      expect(err.code).toEqual(403);
      expect(err.message).toMatch(/Forbidden/);
    }
    expect.assertions(2);
  });
});

describe("iterateDevices", () => {
  test("authorizes if necessary", async () => {
    p = polly(__dirname, "iterateDevices");

    p.server.any().intercept((req, res) => {
      // eslint-disable-next-line @typescript-eslint/camelcase
      res.status(201).json({ access_token: "token", expires_in: 10000 });
    });

    const client = createClient(config);
    const cbSpy = jest.fn().mockResolvedValue(false);

    await client.iterateDevices(cbSpy);
    expect(cbSpy).toBeCalledTimes(1);
  });
});
