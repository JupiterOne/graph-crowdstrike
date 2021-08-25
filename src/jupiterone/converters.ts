import {
  convertProperties,
  createIntegrationEntity,
  EntityFromIntegration,
  generateRelationshipType,
  getTime,
} from "@jupiterone/jupiter-managed-integration-sdk";
import { Entities } from "../constants";

import { Device, PreventionPolicy } from "../crowdstrike/types";

function normalizeMacAddress(macAddress: string): string {
  return macAddress.replace(/-/g, ":").toLowerCase();
}

export function createAccountEntity(integrationInstance: {
  id: string;
  name: string;
}): EntityFromIntegration {
  return createIntegrationEntity({
    entityData: {
      source: {},
      assign: {
        _class: Entities.ACCOUNT._class,
        _type: Entities.ACCOUNT._type,
        _key: `${Entities.ACCOUNT._type}|${integrationInstance.id}`,
        name: integrationInstance.name,
      },
    },
  });
}

export function createProtectionServiceEntity(integrationInstance: {
  id: string;
}): EntityFromIntegration {
  return createIntegrationEntity({
    entityData: {
      source: {},
      assign: {
        _class: Entities.PROTECTION_SERVICE._class,
        _type: Entities.PROTECTION_SERVICE._type,
        _key: `${Entities.PROTECTION_SERVICE._type}|${integrationInstance.id}`,
        name: "CrowdStrike Endpoint Protection Service",
        category: ["software", "other"],
        endpoints: ["https://falcon.crowdstrike.com/"],
      },
    },
  });
}

export const SENSOR_AGENT_ENTITY_TYPE = "crowdstrike_sensor";

/**
 * @param zoneGroup {String} - `us-east-1d`
 * @returns {String} - `us-east-1`
 */
function zoneGroupToRegion(zoneGroup: string): string {
  return zoneGroup.substr(0, zoneGroup.length - 1);
}

export function buildEc2InstanceArn(source: Device): string | undefined {
  const {
    service_provider: serviceProvider, // Ex. AWS_EC2
    service_provider_account_id: serviceProviderAccountId, // Ex. 123456789
    zone_group: zoneGroup, // Ex. us-east-1d
    instance_id: instanceId, // i-1234567
  } = source;

  if (
    serviceProvider !== "AWS_EC2" ||
    !serviceProviderAccountId ||
    !zoneGroup
  ) {
    return;
  }

  const region = zoneGroupToRegion(zoneGroup as string);

  // arn:aws:ec2:us-east-1:123456789:instance/i-1234567
  return `arn:aws:ec2:${region}:${serviceProviderAccountId}:instance/${instanceId}`;
}

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

        // CrowdStrike formats their MAC addresses in dash-separated form. We
        // normalize the value and copy the original value onto the entity.
        macAddress:
          source.mac_address &&
          normalizeMacAddress(source.mac_address as string),
        originalMacAddress: source.mac_address,

        ec2InstanceArn: buildEc2InstanceArn(source),

        // HACK: Always push HostAgent updates to stimulate mapper updates
        ingestedOn: Date.now(),
      },
    },
  });
}

export const DEVICE_ENTITY_TYPE = "user_endpoint";
export const DEVICE_ENTITY_CLASS = ["Device", "Host"];
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
  Entities.ACCOUNT._type,
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
  Entities.PROTECTION_SERVICE._type,
);
