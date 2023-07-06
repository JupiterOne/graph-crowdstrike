import { createMockIntegrationLogger } from '@jupiterone/integration-sdk-testing';

import { Recording, setupCrowdstrikeRecording } from '../../test/recording';
import { config, availabilityZoneConfig } from '../../test/config';
import { DEFAULT_ATTEMPT_OPTIONS, FalconAPIClient } from './FalconAPIClient';
import { CrowdStrikeApiClientQueryBuilder } from './CrowdStrikeApiClientQueryBuilder';
import {
  CrowdStrikeApiGateway,
  DEFAULT_RATE_LIMIT_CONFIG,
} from './CrowdStrikeApiGateway';
import fetch from 'node-fetch';

let recording: Recording;

const createClient = (): FalconAPIClient => {
  return new FalconAPIClient({
    logger: createMockIntegrationLogger(),
    crowdStrikeApiGateway: new CrowdStrikeApiGateway(
      config,
      createMockIntegrationLogger(),
      new CrowdStrikeApiClientQueryBuilder(),
      fetch,
      {
        ...DEFAULT_ATTEMPT_OPTIONS,
        delay: 2,
        timeout: 1000,
        factor: 1,
      },
    ),
  });
};

afterEach(async () => {
  if (recording) {
    await recording.stop();
  }
});

describe('authenticate', () => {
  test('obtains token and expiration', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'authenticate',
    });

    let requests = 0;
    recording.server.any().on('request', (_req, _event) => {
      requests++;
    });

    await expect(createClient().authenticate()).resolves.toEqual({
      token: expect.any(String),
      expiresAt: expect.any(Number),
    });

    expect(requests).toEqual(1);
  });

  test('answers cached token before expiration', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'authenticateCached',
    });

    let requests = 0;
    recording.server.any().on('request', (_req, _event) => {
      requests++;
    });

    const client = createClient();
    const access = await client.authenticate();
    await expect(client.authenticate()).resolves.toBe(access);

    expect(requests).toEqual(1);
  });

  test('answers new token after expiration', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'authenticateRefresh',
    });

    let requests = 0;
    recording.server.any().on('request', (_req, _event) => {
      requests++;
    });

    const client = createClient();
    const access = await client.authenticate();

    const realNow = Date.now; // eslint-disable-line @typescript-eslint/unbound-method
    jest
      .spyOn(global.Date, 'now')
      .mockImplementationOnce(() => realNow() + 30 * 60 * 1000);

    const newAccess = await client.authenticate();
    expect(newAccess).not.toBe(access);
    expect(newAccess).toEqual({
      token: expect.any(String),
      expiresAt: expect.any(Number),
    });

    expect(requests).toEqual(2);
  });

  test('throws errors', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'authenticateError',
      options: {
        recordFailedRequests: true,
      },
    });

    const client = new FalconAPIClient({
      logger: createMockIntegrationLogger(),
      crowdStrikeApiGateway: new CrowdStrikeApiGateway(
        { ...config, clientSecret: 'test-error-handling' },
        createMockIntegrationLogger(),
        new CrowdStrikeApiClientQueryBuilder(),
        fetch,
      ),
    });
    try {
      await client.authenticate();
    } catch (err) {
      expect(err.status).toEqual(403);
      expect(err.message).toMatch(/Forbidden/);
    }
    expect.assertions(2);
  });
});

describe('executeAPIRequest', () => {
  test('waits until retryafter on 500 response', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'executeAPIRequest500',
      options: {
        recordFailedRequests: true,
      },
    });

    const requestTimesInMs: number[] = [];
    recording.server.any().on('request', (_req, _event) => {
      requestTimesInMs.push(Date.now());
    });

    recording.server
      .any()
      .times(1)
      .intercept((_req, res) => {
        res.status(500);
      });

    await expect(createClient().authenticate()).rejects.toThrowError(
      'Provider API failed at https://api.crowdstrike.com/oauth2/token: 500 Internal Server Error',
    );

    expect(requestTimesInMs.length).toBe(DEFAULT_ATTEMPT_OPTIONS.maxAttempts);
  });

  test('waits until retryafter on 429 response', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'executeAPIRequest429',
    });

    const requestTimesInMs: number[] = [];
    recording.server.any().on('request', (_req, _event) => {
      requestTimesInMs.push(Date.now());
    });

    const retryAfterTimeInSeconds = Date.now() / 1000 - 60 + 1; // server responds with epoch time in seconds, Date.now() returns epoch time in ms
    recording.server
      .any()
      .times(1)
      .intercept((_req, res) => {
        res
          .status(429)
          .setHeaders({
            'x-ratelimit-retryafter': String(retryAfterTimeInSeconds),
          })
          .json({
            errors: [
              {
                code: 429,
                message: 'API rate limit exceeded.',
              },
            ],
          });
      });

    await createClient().authenticate();

    expect(requestTimesInMs.length).toBe(2);
    expect(requestTimesInMs[1]).toBeGreaterThan(retryAfterTimeInSeconds * 1000);
  });

  test('retries 429 response limited times', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'executeAPIRequest429limit',
    });

    const requestTimesInMs: number[] = [];
    recording.server.any().on('request', (_req, _event) => {
      requestTimesInMs.push(Date.now());
    });

    const retryAfterTimeInSeconds = Date.now() / 1000 - 60 - 10; // server responds with epoch time in seconds, Date.now() returns epoch time in ms
    recording.server.any().intercept((_req, res) => {
      res
        .status(429)
        .setHeaders({
          'x-ratelimit-retryafter': String(retryAfterTimeInSeconds),
        })
        .json({
          errors: [
            {
              code: 429,
              message: 'API rate limit exceeded.',
            },
          ],
        });
    });

    const client = createClient();

    await expect(client.authenticate()).rejects.toThrowError(
      'Provider API failed at https://api.crowdstrike.com/oauth2/token: 429 Too Many Requests',
    );

    expect(requestTimesInMs.length).toBe(DEFAULT_ATTEMPT_OPTIONS.maxAttempts);
  });

  test.skip('throttles at specified reserveLimit', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'executeAPIRequestReserveLimit',
    });

    let limitRemaining = DEFAULT_RATE_LIMIT_CONFIG.reserveLimit + 2;

    recording.server.any().intercept((_req, res) => {
      limitRemaining--;
      res
        .status(201)
        .setHeaders({
          'x-ratelimit-limit': '10',
          'x-ratelimit-remaining': String(limitRemaining),
        })
        .json({
          errors: [
            {
              code: 429,
              message: 'API rate limit exceeded.',
            },
          ],
        });
    });

    const client = new FalconAPIClient({
      logger: createMockIntegrationLogger(),
      crowdStrikeApiGateway: new CrowdStrikeApiGateway(
        config,
        createMockIntegrationLogger(),
        new CrowdStrikeApiClientQueryBuilder(),
        fetch,
      ),
    });

    const startTime = Date.now();

    await client.authenticate();
    await client.authenticate();
    await client.authenticate();

    expect(Date.now() - startTime).toBeGreaterThan(1000);
  });
});

describe('iterateDevices', () => {
  test.skip('partial set', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'iterateDevicesInterrupted',
    });

    const cbSpy = jest.fn().mockResolvedValue(false);

    const paginationState = await createClient().iterateDevices({
      callback: cbSpy,
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

  test.skip('resumes from pagination state', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'iterateDevicesResumes',
    });

    const client = createClient();
    const cbSpy = jest.fn().mockResolvedValueOnce(false);
    const paginationState = await client.iterateDevices({
      callback: cbSpy,
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

  test.skip('pagination with filter', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'iterateDevicesFilter',
    });

    const client = createClient();
    const cbSpy = jest.fn().mockResolvedValueOnce(false);

    // This is likely to fail when a new account is used with new host seen dates
    const paginationState = await client.iterateDevices({
      callback: cbSpy,
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

  test.skip('throws error on expired pagination offset cursor', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'iterateDevicesExpiredOffsetCursor',
      options: {
        recordFailedRequests: true,
      },
    });

    const cbSpy = jest.fn();
    await expect(
      createClient().iterateDevices({
        callback: cbSpy,
      }),
    ).rejects.toThrowError(/expired/);
  });
});

describe('iteratePreventionPolicies', () => {
  test('complete set in single callback', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'iteratePreventionPoliciesSinglePage',
    });

    const cbSpy = jest.fn();

    await createClient().iteratePreventionPolicies({
      callback: cbSpy,
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

  test('partial set in multiple callbacks', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'iteratePreventionPoliciesCompletes',
    });

    const cbSpy = jest.fn();

    await createClient().iteratePreventionPolicies({
      callback: cbSpy,
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

  test.skip('partial set', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'iteratePreventionPoliciesInterrupted',
    });

    const cbSpy = jest.fn().mockResolvedValue(false);

    const paginationState = await createClient().iteratePreventionPolicies({
      callback: cbSpy,
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

  test.skip('resumes from pagination state', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'iteratePreventionPoliciesResumes',
    });

    const client = createClient();
    const cbSpy = jest.fn().mockResolvedValueOnce(false);
    const paginationState = await client.iteratePreventionPolicies({
      callback: cbSpy,
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

  test.skip('pagination with filter', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'iteratePreventionPoliciesFilter',
    });

    const client = createClient();
    const cbSpy = jest.fn().mockResolvedValueOnce(false);

    // This is likely to fail when a new account is used with new host seen dates
    const paginationState = await client.iteratePreventionPolicies({
      callback: cbSpy,
      // query: { filter: "platform_name:'Windows'" },
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
      // query: { filter: "platform_name:'Windows'" },
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

describe('iteratePreventionPolicyMemberIds', () => {
  test('complete set in single callback', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'iteratePreventionPolicyMemberIdsSinglePage',
    });

    const cbSpy = jest.fn();

    await createClient().iteratePreventionPolicyMemberIds({
      callback: cbSpy,
      policyId: '40bb0ba06b9f4a10a4330fccecc01f84',
    });

    expect(cbSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.any(String),
        expect.any(String),
        expect.any(String),
      ]),
    );
  }, 20000);

  test('partial set in multiple callbacks', async () => {
    recording = setupCrowdstrikeRecording({
      directory: __dirname,
      name: 'iteratePreventionPolicyMemberIdsCompletes',
    });

    const cbSpy = jest.fn();

    await createClient().iteratePreventionPolicyMemberIds({
      callback: cbSpy,
      policyId: '40bb0ba06b9f4a10a4330fccecc01f84',
    });

    expect(cbSpy).toHaveBeenCalledTimes(3);

    expect(cbSpy.mock.calls[0]).toEqual([[expect.any(String)]]);
    expect(cbSpy.mock.calls[1]).toEqual([[expect.any(String)]]);
    expect(cbSpy.mock.calls[2]).toEqual([[expect.any(String)]]);
  }, 20000);
});

describe('test availability zones', () => {
  test('specify availability zone', async () => {
    const client = new FalconAPIClient({
      logger: createMockIntegrationLogger(),
      crowdStrikeApiGateway: new CrowdStrikeApiGateway(
        availabilityZoneConfig,
        createMockIntegrationLogger(),
        new CrowdStrikeApiClientQueryBuilder(),
        fetch,
        {
          ...DEFAULT_ATTEMPT_OPTIONS,
          delay: 2,
          timeout: 1000,
          factor: 1,
        },
      ),
    });
    // We really only care that the API URL is properly formed to include the availability zone.  It doesn't need to have
    // a successful run.  Additionally, we don't need to test the default use case of not providing an availability zone,
    // since all of our prior tests are thoroughly testing that case.
    await expect(client.authenticate()).rejects.toThrowError(
      'request to https://api.availabilitytestzone.crowdstrike.com/oauth2/token failed, reason: getaddrinfo ENOTFOUND api.availabilitytestzone.crowdstrike.com',
    );
  });
});
