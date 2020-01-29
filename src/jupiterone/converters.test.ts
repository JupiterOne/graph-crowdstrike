/* eslint-disable @typescript-eslint/camelcase */

import {
  createTestIntegrationData,
  IntegrationInstance,
  RelationshipDirection,
} from "@jupiterone/jupiter-managed-integration-sdk";

import { Device, PreventionPolicy } from "../crowdstrike/types";
import {
  createAccountEntity,
  createSensorAgentEntity,
  createPreventionPolicyEntity,
  createProtectionServiceEntity,
  createSensorAgentDeviceMappedRelationship,
} from "./converters";

describe("createAccountEntity", () => {
  let instance: IntegrationInstance;

  beforeEach(() => {
    instance = createTestIntegrationData().instance;
  });

  test("properties transferred", () => {
    instance.id = "instance-123";
    instance.name = "My CrowdStrike";

    expect(createAccountEntity(instance)).toEqual({
      _class: ["Account"],
      _type: "crowdstrike_account",
      _key: "crowdstrike_account|instance-123",
      _rawData: [],
      name: "My CrowdStrike",
      displayName: "My CrowdStrike",
    });
  });
});

describe("createProtectionServiceEntity", () => {
  let instance: IntegrationInstance;

  beforeEach(() => {
    instance = createTestIntegrationData().instance;
  });

  test("properties transferred", () => {
    instance.id = "instance-123";

    expect(createProtectionServiceEntity(instance)).toEqual({
      _class: ["Service"],
      _type: "crowdstrike_endpoint_protection",
      _key: "crowdstrike_endpoint_protection|instance-123",
      _rawData: [],
      name: "CrowdStrike Endpoint Protection Service",
      displayName: "CrowdStrike Endpoint Protection Service",
      category: ["software", "other"],
      endpoints: ["https://falcon.crowdstrike.com/"],
    });
  });
});

describe("createSensorAgent*", () => {
  const source: Device = {
    device_id: "b7bbf18d26b344225072b1be2ae8b9e4",
    cid: "9e09b297082d49bb8209de043d880d14",
    agent_load_flags: "0",
    agent_local_time: "2016-03-25T12:14:01.127Z",
    agent_version: "0.0.0000.0",
    bios_manufacturer: "Crowdstrike",
    bios_version: "11.1.3 (32521)",
    build_number: "7601",
    config_id_base: "65994754",
    config_id_build: "0",
    config_id_platform: "3",
    external_ip: "54.183.25.1",
    mac_address: "08-00-27-51-56-d8",
    hostname: "Sample-Detect-2",
    first_seen: "2019-12-02T15:54:40Z",
    last_seen: "2019-12-02T15:54:40Z",
    local_ip: "15.2.0.10",
    major_version: "6",
    minor_version: "1",
    os_version: "Windows 7",
    platform_id: "0",
    platform_name: "Windows",
    policies: [
      {
        policy_type: "prevention",
        policy_id: "40bb0ba06b9f4a10a4330fccecc01f84",
        applied: false,
        settings_hash: "b030fc2e",
        assigned_date: "2019-12-02T15:57:02.852608239Z",
        applied_date: null,
        rule_groups: [],
      },
    ],
    device_policies: {
      prevention: {
        policy_type: "prevention",
        policy_id: "40bb0ba06b9f4a10a4330fccecc01f84",
        applied: false,
        settings_hash: "b030fc2e",
        assigned_date: "2019-12-02T15:57:02.852608239Z",
        applied_date: null,
        rule_groups: [],
      },
      sensor_update: {
        policy_type: "sensor-update",
        policy_id: "345eee272e244c4ca2554b0a701a0d95",
        applied: false,
        settings_hash: "65994753|3|2|automatic;0",
        assigned_date: "2019-12-02T15:57:02.852613977Z",
        applied_date: null,
        uninstall_protection: "DISABLED",
      },
      device_control: {
        policy_type: "device-control",
        policy_id: "a0a599ce2ef642afafe0d61aa1e27592",
        applied: false,
        assigned_date: "2019-12-02T15:57:02.852622432Z",
        applied_date: null,
      },
    },
    product_type: "1",
    product_type_desc: "Workstation",
    service_pack_major: "1",
    service_pack_minor: "0",
    pointer_size: "8",
    status: "normal",
    system_manufacturer: "CloudSim",
    system_product_name: "Crowdstrike",
    modified_timestamp: "2019-12-02T15:57:03Z",
    slow_changing_modified_timestamp: "2019-12-02T15:54:41Z",
    meta: {
      version: "4",
    },
  };

  test("createSensorAgentEntity", () => {
    expect(createSensorAgentEntity(source)).toEqual({
      _class: ["HostAgent"],
      _type: "crowdstrike_sensor",
      _key: "b7bbf18d26b344225072b1be2ae8b9e4",
      _rawData: [{ name: "default", rawData: source }],
      name: "Sample-Detect-2",
      displayName: "Sample-Detect-2",
      status: "normal",
      function: ["anti-malware"],
    });
  });

  test("createSensorAgentDeviceMappedRelationship", () => {
    const deviceEntity = createSensorAgentEntity(source);
    expect(
      createSensorAgentDeviceMappedRelationship(source, deviceEntity),
    ).toEqual({
      _key: "b7bbf18d26b344225072b1be2ae8b9e4|protects|device-Sample-Detect-2",
      _type: "crowdstrike_sensor_protects_device",
      _class: "PROTECTS",
      _mapping: {
        relationshipDirection: RelationshipDirection.FORWARD,
        sourceEntityKey: "b7bbf18d26b344225072b1be2ae8b9e4",
        targetFilterKeys: [["_type", "hostname"]],
        targetEntity: {
          _type: "user_endpoint",
          _class: ["Device", "Host"],
          displayName: "Sample-Detect-2",
          hostname: "Sample-Detect-2",
        },
      },
    });
  });
});

describe("createPreventionPolicyEntity", () => {
  test("properties transferred", () => {
    const source: PreventionPolicy = {
      id: "438ad82d1f584eb99d7ec24e333be231",
      name: "platform_default",
      description: "Platform default policy",
      platform_name: "iOS",
      groups: [],
      enabled: true,
      created_by: "CS Salesforce",
      created_timestamp: "2019-12-02T15:39:34.443152466Z",
      modified_by: "CS Salesforce",
      modified_timestamp: "2019-12-02T15:39:34.443152466Z",
      prevention_settings: [
        {
          name: "Mobile",
          settings: [
            {
              id: "MobileWiFiReportingFunctionality",
              name: "Connected Wi-Fi networks",
              type: "toggle",
              description:
                "See Wi-Fi networks the device is connected to. This can include location information, which might be deemed private data in some countries.",
              value: {
                enabled: false,
              },
            },
            {
              id: "MobileBluetoothReportingFunctionality",
              name: "Connected Bluetooth devices",
              type: "toggle",
              description:
                "See Bluetooth devices that the mobile device is connected to, including Bluetooth MAC addresses. These addresses can identify device type, which could be personal in nature.",
              value: {
                enabled: false,
              },
            },
          ],
        },
      ],
    };

    expect(createPreventionPolicyEntity(source)).toEqual({
      _class: ["ControlPolicy"],
      _type: "crowdstrike_prevention_policy",
      _key: "438ad82d1f584eb99d7ec24e333be231",
      _rawData: [{ name: "default", rawData: source }],
      name: "platform_default",
      displayName: "platform_default",
      description: "Platform default policy",
      createdOn: 1575301174443,
      updatedOn: 1575301174443,
      createdBy: "CS Salesforce",
      updatedBy: "CS Salesforce",
      active: true,
    });
  });
});
