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

describe("executeAPIRequest", () => {
  test("waits until retryafter on 429 response", async () => {
    p = polly(__dirname, "executeAPIRequest429");

    const requestTimes: number[] = [];
    p.server.any().on("request", (_req, _event) => {
      requestTimes.push(Date.now());
    });

    const retryAfter = Date.now() + 1000;
    p.server
      .any()
      .times(1)
      .intercept((_req, res) => {
        res
          .status(429)
          .setHeaders({
            "x-ratelimit-retryafter": String(retryAfter),
          })
          .json({
            errors: [
              {
                code: 429,
                message: "API rate limit exceeded.",
              },
            ],
          });
      });

    const client = new FalconAPIClient(config);
    await client.authenticate();

    expect(requestTimes.length).toBe(2);
    expect(requestTimes[1]).toBeGreaterThan(retryAfter);
  });

  test("retries 429 response limited times", async () => {
    p = polly(__dirname, "executeAPIRequest429limit");

    const requestTimes: number[] = [];
    p.server.any().on("request", (_req, _event) => {
      requestTimes.push(Date.now());
    });

    p.server.any().intercept((_req, res) => {
      res
        .status(429)
        .setHeaders({
          "x-ratelimit-retryafter": String(Date.now() - 10),
        })
        .json({
          errors: [
            {
              code: 429,
              message: "API rate limit exceeded.",
            },
          ],
        });
    });

    const client = new FalconAPIClient(config, {
      maxAttempts: 2,
    });

    await expect(client.authenticate()).rejects.toThrowError(/2/);

    expect(requestTimes.length).toBe(2);
  });

  test("throttles at specified reserveLimit", async () => {
    p = polly(__dirname, "executeAPIRequestReserveLimit");

    let limitRemaining = 10;

    p.server.any().intercept((_req, res) => {
      limitRemaining--;
      res
        .status(201)
        .setHeaders({
          "x-ratelimit-limit": "10",
          "x-ratelimit-remaining": String(limitRemaining),
        })
        .json({
          errors: [
            {
              code: 429,
              message: "API rate limit exceeded.",
            },
          ],
        });
    });

    const client = new FalconAPIClient(config, {
      reserveLimit: 8,
      cooldownPeriod: 1000,
    });

    const startTime = Date.now();

    await client.authenticate();
    await client.authenticate();
    await client.authenticate();

    expect(Date.now() - startTime).toBeGreaterThan(1000);
  });
});

describe("iterateDevices", () => {
  test("complete set in single callback, no pagination state", async () => {
    p = polly(__dirname, "iterateDevicesSinglePage");
    const client = new FalconAPIClient(config);
    const cbSpy = jest.fn();
    const paginationState = await client.iterateDevices(cbSpy);
    expect(paginationState).toBeUndefined();
    expect(cbSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ cid: expect.any(String) }),
        expect.objectContaining({ cid: expect.any(String) }),
        expect.objectContaining({ cid: expect.any(String) }),
      ]),
    );
  }, 20000);

  test("partial set in multiple callbacks, no pagination state", async () => {
    p = polly(__dirname, "iterateDevicesCompletes");
    const client = new FalconAPIClient(config);
    const cbSpy = jest.fn();
    const paginationState = await client.iterateDevices(cbSpy, { limit: 1 });
    expect(paginationState).toBeUndefined();
    expect(cbSpy).toHaveBeenCalledTimes(3);
    expect(cbSpy.mock.calls[0]).toEqual([
      [expect.objectContaining({ cid: expect.any(String) })],
    ]);
    expect(cbSpy.mock.calls[1]).toEqual([
      [expect.objectContaining({ cid: expect.any(String) })],
    ]);
    expect(cbSpy.mock.calls[2]).toEqual([
      [expect.objectContaining({ cid: expect.any(String) })],
    ]);
  }, 20000);

  test("partial set in multiple callbacks, pagination state when interrupted", async () => {
    p = polly(__dirname, "iterateDevicesInterrupted");
    const client = new FalconAPIClient(config);
    const cbSpy = jest.fn().mockResolvedValue(false);
    const paginationState = await client.iterateDevices(cbSpy, { limit: 1 });
    expect(paginationState).toEqual({
      limit: 1,
      seen: 1,
      total: 3,
      expiresAt: expect.any(Number), // eslint-disable-line @typescript-eslint/camelcase
      offset: expect.any(String),
    });
    expect(cbSpy).toHaveBeenCalledTimes(1);
    expect(cbSpy.mock.calls[0]).toEqual([
      [expect.objectContaining({ cid: expect.any(String) })],
    ]);
  }, 20000);

  test("resumes from pagination state", async () => {
    p = polly(__dirname, "iterateDevicesResumes");
    const client = new FalconAPIClient(config);
    const cbSpy = jest.fn().mockResolvedValueOnce(false);
    const paginationState = await client.iterateDevices(cbSpy, { limit: 1 });
    expect(paginationState).not.toBeUndefined();
    const finalPaginationState = await client.iterateDevices(
      cbSpy,
      paginationState,
    );
    expect(finalPaginationState).toBeUndefined();
    expect(cbSpy).toHaveBeenCalledTimes(3);
  });

  test("throws error on expired pagination offset cursor", async () => {
    p = polly(__dirname, "iterateDevicesExpiredOffsetCursor", {
      recordFailedRequests: true,
    });
    const client = new FalconAPIClient(config);
    const cbSpy = jest.fn();
    await expect(
      client.iterateDevices(cbSpy, {
        limit: 1,
        offset:
          "DnF1ZXJ5VGhlbkZldGNoBQAAAAA6iW-VFnpjQldDMjNiU2htV1FGbUo5anc1d0EAAAAAOnTgtRZqV0xVRF9ndFFhQ09zYkVhTzNNOUxnAAAAADpz2L8WSWdUN2d1OVBUM2kxNGNVMUlaU1BZUQAAAAA6hrG3FlR6aHpFU1UxUkNpZ3FVV2tWNVBkQ2cAAAAAOnto1hZTajRqVll0dVF3U2VQQThXdlo3ZjZB",
        expiresAt: Date.now() - 1,
      }),
    ).rejects.toThrowError(/expired/);
  });
});
