import { Polly } from "@pollyjs/core";

import polly from "../../test/helpers/polly";
import config from "../../test/integrationInstanceConfig";
import { FalconAPIClient } from "./FalconAPIClient";

let p: Polly;

const createClient = (): FalconAPIClient => {
  return new FalconAPIClient({ credentials: config });
};

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

    await expect(createClient().authenticate()).resolves.toEqual({
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

    const client = createClient();
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

    const client = createClient();
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
      credentials: {
        ...config,
        clientSecret: "test-error-handling",
      },
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

    await createClient().authenticate();

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

    const client = new FalconAPIClient({
      credentials: config,
      rateLimitConfig: {
        maxAttempts: 2,
      },
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

    const client = new FalconAPIClient({
      credentials: config,
      rateLimitConfig: {
        reserveLimit: 8,
        cooldownPeriod: 1000,
      },
    });

    const startTime = Date.now();

    await client.authenticate();
    await client.authenticate();
    await client.authenticate();

    expect(Date.now() - startTime).toBeGreaterThan(1000);
  });
});

describe("iterateDevices", () => {
  test("complete set in single callback", async () => {
    p = polly(__dirname, "iterateDevicesSinglePage");
    const cbSpy = jest.fn();

    const paginationState = await createClient().iterateDevices({
      callback: cbSpy,
    });

    expect(paginationState).toEqual({
      finished: true,
      limit: undefined,
      pages: 1,
      seen: 3,
      total: 3,
    });

    expect(cbSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ cid: expect.any(String) }),
        expect.objectContaining({ cid: expect.any(String) }),
        expect.objectContaining({ cid: expect.any(String) }),
      ]),
    );
  }, 20000);

  test("partial set in multiple callbacks", async () => {
    p = polly(__dirname, "iterateDevicesCompletes");
    const cbSpy = jest.fn();

    const paginationState = await createClient().iterateDevices({
      callback: cbSpy,
      pagination: { limit: 1 },
    });

    expect(paginationState).toEqual({
      finished: true,
      limit: 1,
      pages: 3,
      seen: 3,
      total: 3,
    });

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

  test("partial set", async () => {
    p = polly(__dirname, "iterateDevicesInterrupted");
    const cbSpy = jest.fn().mockResolvedValue(false);

    const paginationState = await createClient().iterateDevices({
      callback: cbSpy,
      pagination: { limit: 1 },
    });

    expect(paginationState).toEqual({
      finished: false,
      pages: 1,
      limit: 1,
      seen: 1,
      total: 3,
      expiresAt: expect.any(Number),
      offset: expect.any(String),
    });

    expect(cbSpy).toHaveBeenCalledTimes(1);
    expect(cbSpy.mock.calls[0]).toEqual([
      [expect.objectContaining({ cid: expect.any(String) })],
    ]);
  }, 20000);

  test("resumes from pagination state", async () => {
    p = polly(__dirname, "iterateDevicesResumes");
    const client = createClient();
    const cbSpy = jest.fn().mockResolvedValueOnce(false);
    const paginationState = await client.iterateDevices({
      callback: cbSpy,
      pagination: { limit: 1 },
    });
    expect(paginationState).toEqual({
      finished: false,
      pages: 1,
      limit: 1,
      seen: 1,
      total: 3,
      expiresAt: expect.any(Number),
      offset: expect.any(String),
    });
    const finalPaginationState = await client.iterateDevices({
      callback: cbSpy,
      pagination: paginationState,
    });
    expect(finalPaginationState).toEqual({
      finished: true,
      pages: 3,
      limit: 1,
      seen: 3,
      total: 3,
    });
    expect(cbSpy).toHaveBeenCalledTimes(3);
  }, 20000);

  test("pagination with filter", async () => {
    p = polly(__dirname, "iterateDevicesFilter");
    const client = createClient();
    const cbSpy = jest.fn().mockResolvedValueOnce(false);

    // This is likely to fail when a new account is used with new host seen dates
    const paginationState = await client.iterateDevices({
      callback: cbSpy,
      pagination: { limit: 1 },
      query: { filter: "last_seen:>='2019-12-02T15:54:40Z'" },
    });

    expect(paginationState).toEqual({
      finished: false,
      pages: 1,
      limit: 1,
      seen: 1,
      total: 2,
      expiresAt: expect.any(Number),
      offset: expect.any(String),
    });

    expect(cbSpy).toHaveBeenCalledTimes(1);
    expect(cbSpy.mock.calls[0]).toEqual([
      [expect.objectContaining({ cid: expect.any(String) })],
    ]);

    const finalPaginationState = await client.iterateDevices({
      callback: cbSpy,
      pagination: paginationState,
      query: { filter: "last_seen:>='2019-12-02T15:54:40Z'" },
    });

    expect(finalPaginationState).toEqual({
      finished: true,
      limit: 1,
      pages: 2,
      seen: 2,
      total: 2,
    });

    expect(cbSpy).toHaveBeenCalledTimes(2);
    expect(cbSpy.mock.calls[1]).toEqual([
      [expect.objectContaining({ cid: expect.any(String) })],
    ]);
  }, 20000);

  test("throws error on expired pagination offset cursor", async () => {
    p = polly(__dirname, "iterateDevicesExpiredOffsetCursor", {
      recordFailedRequests: true,
    });
    const cbSpy = jest.fn();
    await expect(
      createClient().iterateDevices({
        callback: cbSpy,
        pagination: {
          limit: 1,
          offset:
            "DnF1ZXJ5VGhlbkZldGNoBQAAAAA6iW-VFnpjQldDMjNiU2htV1FGbUo5anc1d0EAAAAAOnTgtRZqV0xVRF9ndFFhQ09zYkVhTzNNOUxnAAAAADpz2L8WSWdUN2d1OVBUM2kxNGNVMUlaU1BZUQAAAAA6hrG3FlR6aHpFU1UxUkNpZ3FVV2tWNVBkQ2cAAAAAOnto1hZTajRqVll0dVF3U2VQQThXdlo3ZjZB",
          expiresAt: Date.now() - 1,
        },
      }),
    ).rejects.toThrowError(/expired/);
  });
});

describe("iteratePreventionPolicies", () => {
  test("complete set in single callback", async () => {
    p = polly(__dirname, "iteratePreventionPoliciesSinglePage");
    const cbSpy = jest.fn();

    const paginationState = await createClient().iteratePreventionPolicies({
      callback: cbSpy,
    });

    expect(paginationState).toEqual({
      finished: true,
      limit: undefined,
      pages: 1,
      seen: 6,
      total: 6,
    });

    expect(cbSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: expect.any(String) }),
        expect.objectContaining({ id: expect.any(String) }),
        expect.objectContaining({ id: expect.any(String) }),
        expect.objectContaining({ id: expect.any(String) }),
        expect.objectContaining({ id: expect.any(String) }),
        expect.objectContaining({ id: expect.any(String) }),
      ]),
    );
  }, 20000);

  test("partial set in multiple callbacks", async () => {
    p = polly(__dirname, "iteratePreventionPoliciesCompletes");
    const cbSpy = jest.fn();

    const paginationState = await createClient().iteratePreventionPolicies({
      callback: cbSpy,
      pagination: { limit: 1 },
    });

    expect(paginationState).toEqual({
      finished: true,
      limit: 1,
      pages: 6,
      seen: 6,
      total: 6,
    });

    expect(cbSpy).toHaveBeenCalledTimes(6);

    expect(cbSpy.mock.calls[0]).toEqual([
      [expect.objectContaining({ id: expect.any(String) })],
    ]);
    expect(cbSpy.mock.calls[1]).toEqual([
      [expect.objectContaining({ id: expect.any(String) })],
    ]);
    expect(cbSpy.mock.calls[2]).toEqual([
      [expect.objectContaining({ id: expect.any(String) })],
    ]);
    expect(cbSpy.mock.calls[3]).toEqual([
      [expect.objectContaining({ id: expect.any(String) })],
    ]);
    expect(cbSpy.mock.calls[4]).toEqual([
      [expect.objectContaining({ id: expect.any(String) })],
    ]);
    expect(cbSpy.mock.calls[5]).toEqual([
      [expect.objectContaining({ id: expect.any(String) })],
    ]);
  }, 20000);

  test("partial set", async () => {
    p = polly(__dirname, "iteratePreventionPoliciesInterrupted");
    const cbSpy = jest.fn().mockResolvedValue(false);

    const paginationState = await createClient().iteratePreventionPolicies({
      callback: cbSpy,
      pagination: { limit: 1 },
    });

    expect(paginationState).toEqual({
      finished: false,
      pages: 1,
      limit: 1,
      seen: 1,
      total: 6,
      offset: 1,
    });

    expect(cbSpy).toHaveBeenCalledTimes(1);
    expect(cbSpy.mock.calls[0]).toEqual([
      [expect.objectContaining({ id: expect.any(String) })],
    ]);
  }, 20000);

  test("resumes from pagination state", async () => {
    p = polly(__dirname, "iteratePreventionPoliciesResumes");
    const client = createClient();
    const cbSpy = jest.fn().mockResolvedValueOnce(false);
    const paginationState = await client.iteratePreventionPolicies({
      callback: cbSpy,
      pagination: { limit: 1 },
    });
    expect(paginationState).toEqual({
      finished: false,
      pages: 1,
      limit: 1,
      seen: 1,
      total: 6,
      offset: 1,
    });
    const finalPaginationState = await client.iteratePreventionPolicies({
      callback: cbSpy,
      pagination: paginationState,
    });
    expect(finalPaginationState).toEqual({
      finished: true,
      pages: 6,
      limit: 1,
      seen: 6,
      total: 6,
    });
    expect(cbSpy).toHaveBeenCalledTimes(6);
  }, 20000);

  test("pagination with filter", async () => {
    p = polly(__dirname, "iteratePreventionPoliciesFilter");
    const client = createClient();
    const cbSpy = jest.fn().mockResolvedValueOnce(false);

    // This is likely to fail when a new account is used with new host seen dates
    const paginationState = await client.iteratePreventionPolicies({
      callback: cbSpy,
      pagination: { limit: 1 },
      query: { filter: "platform_name:'Windows'" },
    });

    expect(paginationState).toEqual({
      finished: false,
      pages: 1,
      limit: 1,
      seen: 1,
      total: 2,
      offset: 1,
    });

    expect(cbSpy).toHaveBeenCalledTimes(1);
    expect(cbSpy.mock.calls[0]).toEqual([
      [expect.objectContaining({ id: expect.any(String) })],
    ]);

    const finalPaginationState = await client.iteratePreventionPolicies({
      callback: cbSpy,
      pagination: paginationState,
      query: { filter: "platform_name:'Windows'" },
    });

    expect(finalPaginationState).toEqual({
      finished: true,
      limit: 1,
      pages: 2,
      seen: 2,
      total: 2,
    });

    expect(cbSpy).toHaveBeenCalledTimes(2);
    expect(cbSpy.mock.calls[1]).toEqual([
      [expect.objectContaining({ id: expect.any(String) })],
    ]);
  }, 20000);
});

describe("iteratePreventionPolicyMemberIds", () => {
  test("complete set in single callback", async () => {
    p = polly(__dirname, "iteratePreventionPolicyMemberIdsSinglePage");
    const cbSpy = jest.fn();

    const paginationState = await createClient().iteratePreventionPolicyMemberIds(
      {
        callback: cbSpy,
        policyId: "40bb0ba06b9f4a10a4330fccecc01f84",
      },
    );

    expect(paginationState).toEqual({
      finished: true,
      pages: 1,
      seen: 3,
      total: 3,
    });

    expect(cbSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.any(String),
        expect.any(String),
        expect.any(String),
      ]),
    );
  }, 20000);

  test("partial set in multiple callbacks", async () => {
    p = polly(__dirname, "iteratePreventionPolicyMemberIdsCompletes");
    const cbSpy = jest.fn();

    const paginationState = await createClient().iteratePreventionPolicyMemberIds(
      {
        callback: cbSpy,
        pagination: { limit: 1 },
        policyId: "40bb0ba06b9f4a10a4330fccecc01f84",
      },
    );

    expect(paginationState).toEqual({
      finished: true,
      limit: 1,
      pages: 3,
      seen: 3,
      total: 3,
    });

    expect(cbSpy).toHaveBeenCalledTimes(3);

    expect(cbSpy.mock.calls[0]).toEqual([[expect.any(String)]]);
    expect(cbSpy.mock.calls[1]).toEqual([[expect.any(String)]]);
    expect(cbSpy.mock.calls[2]).toEqual([[expect.any(String)]]);
  }, 20000);
});
