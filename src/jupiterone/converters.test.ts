import {
  IntegrationInstance,
  convertProperties,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';

import { createMockExecutionContext } from '@jupiterone/integration-sdk-testing';

import {
  DetectedApplication,
  Device,
  PreventionPolicy,
  Vulnerability,
} from '../crowdstrike/types';
import {
  createAccountEntity,
  createSensorAgentEntity,
  createPreventionPolicyEntity,
  createProtectionServiceEntity,
  createVulnerabilityEntity,
  createDetectedApplicationEntity,
} from './converters';

describe('createAccountEntity', () => {
  let instance: IntegrationInstance;

  beforeEach(() => {
    instance = createMockExecutionContext().instance;
  });

  test('properties transferred', () => {
    instance.id = 'instance-123';
    instance.name = 'My CrowdStrike';

    expect(createAccountEntity(instance)).toEqual({
      _class: ['Account'],
      _type: 'crowdstrike_account',
      _key: 'crowdstrike_account|instance-123',
      _rawData: [],
      name: 'My CrowdStrike',
      displayName: 'My CrowdStrike',
    });
  });
});

describe('createProtectionServiceEntity', () => {
  let instance: IntegrationInstance;

  beforeEach(() => {
    instance = createMockExecutionContext().instance;
  });

  test('properties transferred', () => {
    instance.id = 'instance-123';

    expect(createProtectionServiceEntity(instance)).toEqual({
      _class: ['Service'],
      _type: 'crowdstrike_endpoint_protection',
      _key: 'crowdstrike_endpoint_protection|instance-123',
      _rawData: [],
      name: 'CrowdStrike Endpoint Protection Service',
      displayName: 'CrowdStrike Endpoint Protection Service',
      category: ['software', 'other'],
      endpoints: ['https://falcon.crowdstrike.com/'],
    });
  });
});

describe('createSensorAgent*', () => {
  const source: Device = {
    device_id: 'b7bbf18d26b344225072b1be2ae8b9e4',
    cid: '9e09b297082d49bb8209de043d880d14',
    agent_load_flags: '0',
    agent_local_time: '2016-03-25T12:14:01.127Z',
    agent_version: '0.0.0000.0',
    bios_manufacturer: 'Crowdstrike',
    bios_version: '11.1.3 (32521)',
    build_number: '7601',
    config_id_base: '65994754',
    config_id_build: '0',
    config_id_platform: '3',
    external_ip: '54.183.25.1',
    mac_address: '08-00-27-51-56-d8',
    hostname: 'Sample-Detect-2',
    first_seen: '2019-12-02T15:54:40Z',
    last_seen: '2019-12-02T15:54:40Z',
    local_ip: '15.2.0.10',
    major_version: '6',
    minor_version: '1',
    os_version: 'Windows 7',
    platform_id: '0',
    platform_name: 'Windows',
    policies: [
      {
        policy_type: 'prevention',
        policy_id: '40bb0ba06b9f4a10a4330fccecc01f84',
        applied: false,
        settings_hash: 'b030fc2e',
        assigned_date: '2019-12-02T15:57:02.852608239Z',
        applied_date: null,
        rule_groups: [],
      },
    ],
    device_policies: {
      prevention: {
        policy_type: 'prevention',
        policy_id: '40bb0ba06b9f4a10a4330fccecc01f84',
        applied: false,
        settings_hash: 'b030fc2e',
        assigned_date: '2019-12-02T15:57:02.852608239Z',
        applied_date: null,
        rule_groups: [],
      },
      sensor_update: {
        policy_type: 'sensor-update',
        policy_id: '345eee272e244c4ca2554b0a701a0d95',
        applied: false,
        settings_hash: '65994753|3|2|automatic;0',
        assigned_date: '2019-12-02T15:57:02.852613977Z',
        applied_date: null,
        uninstall_protection: 'DISABLED',
      },
      device_control: {
        policy_type: 'device-control',
        policy_id: 'a0a599ce2ef642afafe0d61aa1e27592',
        applied: false,
        assigned_date: '2019-12-02T15:57:02.852622432Z',
        applied_date: null,
      },
    },
    product_type: '1',
    product_type_desc: 'Workstation',
    service_pack_major: '1',
    service_pack_minor: '0',
    pointer_size: '8',
    status: 'normal',
    system_manufacturer: 'CloudSim',
    system_product_name: 'Crowdstrike',
    modified_timestamp: '2019-12-02T15:57:03Z',
    slow_changing_modified_timestamp: '2019-12-02T15:54:41Z',
    meta: {
      version: '4',
    },
  };

  test('createSensorAgentEntity', () => {
    expect(createSensorAgentEntity(source)).toEqual({
      ...convertProperties(source),
      _class: ['HostAgent'],
      _type: 'crowdstrike_sensor',
      _key: 'b7bbf18d26b344225072b1be2ae8b9e4',
      _rawData: [{ name: 'default', rawData: source }],
      name: 'Sample-Detect-2',
      displayName: 'Sample-Detect-2',
      status: 'normal',
      function: ['anti-malware', 'activity-monitor'],
      firstSeenOn: new Date(source.first_seen).getTime(),
      lastSeenOn: new Date(source.last_seen).getTime(),
      active: true,
      macAddress: '08:00:27:51:56:d8',
      originalMacAddress: '08-00-27-51-56-d8',
      ingestedOn: expect.any(Number),
    });
  });

  test('createSensorAgentEntity EC2 data', () => {
    const device: Device = {
      ...source,
      service_provider: 'AWS_EC2',
      service_provider_account_id: '123456789',
      zone_group: 'us-east-1d',
      instance_id: 'i-1234567',
    };

    expect(createSensorAgentEntity(device)).toEqual({
      ...convertProperties(device),
      _class: ['HostAgent'],
      _type: 'crowdstrike_sensor',
      _key: 'b7bbf18d26b344225072b1be2ae8b9e4',
      _rawData: [{ name: 'default', rawData: device }],
      name: 'Sample-Detect-2',
      displayName: 'Sample-Detect-2',
      status: 'normal',
      function: ['anti-malware', 'activity-monitor'],
      firstSeenOn: new Date(device.first_seen).getTime(),
      lastSeenOn: new Date(device.last_seen).getTime(),
      active: true,
      macAddress: '08:00:27:51:56:d8',
      originalMacAddress: '08-00-27-51-56-d8',
      ingestedOn: expect.any(Number),

      // EC2-specific properties
      serviceProvider: 'AWS_EC2',
      serviceProviderAccountId: '123456789',
      zoneGroup: 'us-east-1d',
      instanceId: 'i-1234567',
      ec2InstanceArn: 'arn:aws:ec2:us-east-1:123456789:instance/i-1234567',
    });
  });

  test('createSensorAgentEntity AWS_EC2_V2 service provider', () => {
    const device: Device = {
      ...source,
      service_provider: 'AWS_EC2_V2',
      service_provider_account_id: '123456789',
      zone_group: 'us-east-1d',
      instance_id: 'i-1234567',
    };

    expect(createSensorAgentEntity(device)).toEqual({
      ...convertProperties(device),
      _class: ['HostAgent'],
      _type: 'crowdstrike_sensor',
      _key: 'b7bbf18d26b344225072b1be2ae8b9e4',
      _rawData: [{ name: 'default', rawData: device }],
      name: 'Sample-Detect-2',
      displayName: 'Sample-Detect-2',
      status: 'normal',
      function: ['anti-malware', 'activity-monitor'],
      firstSeenOn: new Date(device.first_seen).getTime(),
      lastSeenOn: new Date(device.last_seen).getTime(),
      active: true,
      macAddress: '08:00:27:51:56:d8',
      originalMacAddress: '08-00-27-51-56-d8',
      ingestedOn: expect.any(Number),

      // EC2-specific properties
      serviceProvider: 'AWS_EC2_V2',
      serviceProviderAccountId: '123456789',
      zoneGroup: 'us-east-1d',
      instanceId: 'i-1234567',
      ec2InstanceArn: 'arn:aws:ec2:us-east-1:123456789:instance/i-1234567',
    });
  });
});

describe('createPreventionPolicyEntity', () => {
  test('properties transferred', () => {
    const source: PreventionPolicy = {
      id: '438ad82d1f584eb99d7ec24e333be231',
      name: 'platform_default',
      description: 'Platform default policy',
      platform_name: 'iOS',
      groups: [],
      enabled: true,
      created_by: 'CS Salesforce',
      created_timestamp: '2019-12-02T15:39:34.443152466Z',
      modified_by: 'CS Salesforce',
      modified_timestamp: '2019-12-02T15:39:34.443152466Z',
      prevention_settings: [
        {
          name: 'Mobile',
          settings: [
            {
              id: 'MobileWiFiReportingFunctionality',
              name: 'Connected Wi-Fi networks',
              type: 'toggle',
              description:
                'See Wi-Fi networks the device is connected to. This can include location information, which might be deemed private data in some countries.',
              value: {
                enabled: false,
              },
            },
            {
              id: 'MobileBluetoothReportingFunctionality',
              name: 'Connected Bluetooth devices',
              type: 'toggle',
              description:
                'See Bluetooth devices that the mobile device is connected to, including Bluetooth MAC addresses. These addresses can identify device type, which could be personal in nature.',
              value: {
                enabled: false,
              },
            },
          ],
        },
      ],
    };

    expect(createPreventionPolicyEntity(source)).toEqual({
      _class: ['ControlPolicy'],
      _type: 'crowdstrike_prevention_policy',
      _key: '438ad82d1f584eb99d7ec24e333be231',
      _rawData: [{ name: 'default', rawData: source }],
      id: '438ad82d1f584eb99d7ec24e333be231',
      name: 'platform_default',
      displayName: 'platform_default',
      description: 'Platform default policy',
      createdOn: 1575301174443,
      updatedOn: 1575301174443,
      createdBy: 'CS Salesforce',
      updatedBy: 'CS Salesforce',
      active: true,
    });
  });
});

describe('createVulnerabilityEntity', () => {
  test('properties transferred', () => {
    const source: Vulnerability = {
      id: 'feb24177xxxxxxxxxxc48ce11cb_d97920959227xxxxxxxxxx88ed0f',
      cid: '3b12658xxxxxxxxxx5141e3ace49',
      aid: 'feb241773xxxxxxxxxbc48ce11cb',
      created_timestamp: '2021-03-11T21:04:22Z',
      updated_timestamp: '2021-03-11T21:04:22Z',
      status: 'open',
      apps: [
        {
          product_name_version: 'kernel 4.NNN.XXX-140.257.ggl2',
          sub_status: 'closed',
          remediation: { ids: ['1ba86040xxxxxxxxxxx45d9de2705'] },
          evaluation_logic: { id: '' },
        },
      ],
      cve: {
        id: 'CVE-2021-23444',
        base_score: 1,
        severity: 'HIGH',
        exploit_status: 0,
        exprt_rating: 'MEDIUM',
        description: 'test desc',
        published_date: '2022-07-03T06:23:00Z',
        exploitability_score: 1,
        impact_score: 1,
        vector: 'test',
        references: ['alink'],
      },
    };

    expect(createVulnerabilityEntity(source)).toEqual({
      _class: ['Finding'],
      _key: 'feb24177xxxxxxxxxxc48ce11cb_d97920959227xxxxxxxxxx88ed0f',
      _rawData: [
        {
          name: 'default',
          rawData: {
            aid: 'feb241773xxxxxxxxxbc48ce11cb',
            apps: [
              {
                evaluation_logic: {
                  id: '',
                },
                product_name_version: 'kernel 4.NNN.XXX-140.257.ggl2',
                remediation: {
                  ids: ['1ba86040xxxxxxxxxxx45d9de2705'],
                },
                sub_status: 'closed',
              },
            ],
            cid: '3b12658xxxxxxxxxx5141e3ace49',
            created_timestamp: '2021-03-11T21:04:22Z',
            cve: {
              id: 'CVE-2021-23444',
              base_score: 1,
              description: 'test desc',
              exploit_status: 0,
              exploitability_score: 1,
              exprt_rating: 'MEDIUM',
              impact_score: 1,
              published_date: '2022-07-03T06:23:00Z',
              references: ['alink'],
              severity: 'HIGH',
              vector: 'test',
            },
            id: 'feb24177xxxxxxxxxxc48ce11cb_d97920959227xxxxxxxxxx88ed0f',
            status: 'open',
            updated_timestamp: '2021-03-11T21:04:22Z',
          },
        },
      ],
      _type: 'crowdstrike_vulnerability',
      aid: 'feb241773xxxxxxxxxbc48ce11cb',
      cid: '3b12658xxxxxxxxxx5141e3ace49',
      createdOn: expect.any(Number),
      cveId: 'CVE-2021-23444',
      displayName: 'CVE-2021-23444',
      id: 'feb24177xxxxxxxxxxc48ce11cb_d97920959227xxxxxxxxxx88ed0f',
      name: 'CVE-2021-23444',
      status: 'open',
      updatedOn: expect.any(Number),
      open: true,
      productNameVersion: 'kernel 4.NNN.XXX-140.257.ggl2',
      public: true,
      closedOn: undefined,
      description: 'test desc',
      exploitability: 1,
      impact: 1,
      publishedOn: parseTimePropertyValue('2022-07-03T06:23:00Z'),
      vector: 'test',
      vendorAdvisory: undefined,
      severity: 'High',
      score: 1,
      active: undefined,
      references: ['alink'],
      webLink: 'alink',
      exploitStatus: 0,
      exprtRating: 'MEDIUM',
    });
  });
});

describe('createDetectedApplicationEntity', () => {
  test('properties transferred', () => {
    const source: DetectedApplication = {
      product_name_version: 'Windows Server 2016 1607',
      sub_status: 'open',
      remediation: {
        ids: ['9497362a882d3be38b4505cbb9aa1e21'],
      },
      evaluation_logic: {
        id: 'eae54d591fe733398ac4aaa4652c8624',
      },
    };

    expect(createDetectedApplicationEntity(source)).toEqual({
      _class: ['Application'],
      _key: 'windows-server-2016-1607',
      _rawData: [
        {
          name: 'default',
          rawData: {
            product_name_version: 'Windows Server 2016 1607',
            sub_status: 'open',
            remediation: {
              ids: ['9497362a882d3be38b4505cbb9aa1e21'],
            },
            evaluation_logic: {
              id: 'eae54d591fe733398ac4aaa4652c8624',
            },
          },
        },
      ],
      _type: 'crowdstrike_detected_application',
      name: 'Windows Server 2016 1607',
      displayName: 'Windows Server 2016 1607',
      createdOn: undefined,
      open: true,
      remediationIds: ['9497362a882d3be38b4505cbb9aa1e21'],
      evaluationLogicId: 'eae54d591fe733398ac4aaa4652c8624',
    });
  });
});
