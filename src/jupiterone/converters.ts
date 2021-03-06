import {
  convertProperties,
  createIntegrationEntity,
  EntityFromIntegration,
  generateRelationshipType,
  MappedRelationshipFromIntegration,
  RelationshipDirection,
  getTime,
} from "@jupiterone/jupiter-managed-integration-sdk";

import { Device, PreventionPolicy } from "../crowdstrike/types";

export const ACCOUNT_ENTITY_TYPE = "crowdstrike_account";

export function createAccountEntity(integrationInstance: {
  id: string;
  name: string;
}): EntityFromIntegration {
  return createIntegrationEntity({
    entityData: {
      source: {},
      assign: {
        _class: "Account",
        _type: ACCOUNT_ENTITY_TYPE,
        _key: `${ACCOUNT_ENTITY_TYPE}|${integrationInstance.id}`,
        name: integrationInstance.name,
      },
    },
  });
}

export const PROTECTION_SERVICE_ENTITY_TYPE = "crowdstrike_endpoint_protection";

export function createProtectionServiceEntity(integrationInstance: {
  id: string;
}): EntityFromIntegration {
  return createIntegrationEntity({
    entityData: {
      source: {},
      assign: {
        _class: "Service",
        _type: PROTECTION_SERVICE_ENTITY_TYPE,
        _key: `${PROTECTION_SERVICE_ENTITY_TYPE}|${integrationInstance.id}`,
        name: "CrowdStrike Endpoint Protection Service",
        category: ["software", "other"],
        endpoints: ["https://falcon.crowdstrike.com/"],
      },
    },
  });
}

export const SENSOR_AGENT_ENTITY_TYPE = "crowdstrike_sensor";

export function createSensorAgentEntity(source: Device): EntityFromIntegration {
  return createIntegrationEntity({
    entityData: {
      source,
      assign: {
        ...convertProperties(source),
        _class: "HostAgent",
        _type: SENSOR_AGENT_ENTITY_TYPE,
        _key: source.device_id,
        name: source.hostname,
        function: ["anti-malware", "activity-monitor"],
        firstSeenOn: getTime(source.first_seen),
        lastSeenOn: getTime(source.last_seen),
        active: source.status === "normal",
      },
    },
  });
}

export const SENSOR_AGENT_DEVICE_MAPPED_RELATIONSHIP_TYPE =
  "crowdstrike_sensor_protects_device";

export const DEVICE_ENTITY_TYPE = "user_endpoint";
export const DEVICE_ENTITY_CLASS = ["Device", "Host"];

export function createSensorAgentDeviceMappedRelationship(
  device: Device,
  deviceEntity: EntityFromIntegration,
): MappedRelationshipFromIntegration {
  const hostname = device.hostname as string;

  return {
    _key: `${deviceEntity._key}|protects|device-${hostname}`,
    _type: SENSOR_AGENT_DEVICE_MAPPED_RELATIONSHIP_TYPE,
    _class: "PROTECTS",
    _mapping: {
      relationshipDirection: RelationshipDirection.FORWARD,
      sourceEntityKey: deviceEntity._key,
      targetFilterKeys: [["_type", "hostname"]],
      targetEntity: {
        _type: DEVICE_ENTITY_TYPE,
        _class: DEVICE_ENTITY_CLASS,
        displayName: hostname,
        hostname,
        deviceId: device.device_id,
        macAddress: deviceEntity.macAddress,
        osVersion: deviceEntity.osVersion,
        platform: deviceEntity.platformName,
        publicIp: deviceEntity.externalIp,
        publicIpAddress: deviceEntity.externalIp,
        firstSeenOn: deviceEntity.firstSeenOn,
        lastSeenOn: deviceEntity.lastSeenOn,
      },
    },
  };
}

export const PREVENTION_POLICY_ENTITY_TYPE = "crowdstrike_prevention_policy";

export function createPreventionPolicyEntity(
  source: PreventionPolicy,
): EntityFromIntegration {
  return createIntegrationEntity({
    entityData: {
      source,
      assign: {
        _class: "ControlPolicy",
        _type: PREVENTION_POLICY_ENTITY_TYPE,
        createdOn: Date.parse(source.created_timestamp),
        updatedOn: Date.parse(source.modified_timestamp),
        createdBy: source.created_by,
        updatedBy: source.modified_by,
        active: source.enabled,
      },
    },
  });
}

export const ACCOUNT_SENSOR_AGENT_RELATIONSHIP_TYPE = generateRelationshipType(
  "HAS",
  ACCOUNT_ENTITY_TYPE,
  SENSOR_AGENT_ENTITY_TYPE,
);

export const SENSOR_AGENT_PREVENTION_POLICY_RELATIONSHIP_TYPE = generateRelationshipType(
  "ASSIGNED",
  SENSOR_AGENT_ENTITY_TYPE,
  PREVENTION_POLICY_ENTITY_TYPE,
);

export const PREVENTION_POLICY_ENFORCES_PROTECTION_RELATIONSHIP_TYPE = generateRelationshipType(
  "ENFORCES",
  PREVENTION_POLICY_ENTITY_TYPE,
  PROTECTION_SERVICE_ENTITY_TYPE,
);
