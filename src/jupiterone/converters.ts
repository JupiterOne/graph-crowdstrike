import {
  convertProperties,
  createIntegrationEntity,
  Entity,
  generateRelationshipType,
  getTime,
  RelationshipClass,
} from "@jupiterone/integration-sdk-core";
import { Entities } from "../constants";

import { Device, PreventionPolicy } from "../crowdstrike/types";

function normalizeMacAddress(macAddress: string): string {
  return macAddress.replace(/-/g, ":").toLowerCase();
}

export function createAccountEntity(integrationInstance: {
  id: string;
  name: string;
}): Entity {
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
}): Entity {
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

export function createSensorAgentEntity(source: Device): Entity {
  return createIntegrationEntity({
    entityData: {
      source,
      assign: {
        ...convertProperties(source),
        _class: Entities.SENSOR._class,
        _type: Entities.SENSOR._type,
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

export function createPreventionPolicyEntity(source: PreventionPolicy): Entity {
  return createIntegrationEntity({
    entityData: {
      source,
      assign: {
        _class: Entities.PREVENTION_POLICY._class,
        _type: Entities.PREVENTION_POLICY._type,
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
  RelationshipClass.HAS,
  Entities.ACCOUNT._type,
  Entities.SENSOR._type,
);

export const SENSOR_AGENT_PREVENTION_POLICY_RELATIONSHIP_TYPE = generateRelationshipType(
  RelationshipClass.ASSIGNED,
  Entities.SENSOR._type,
  Entities.PREVENTION_POLICY._type,
);

export const PREVENTION_POLICY_ENFORCES_PROTECTION_RELATIONSHIP_TYPE = generateRelationshipType(
  // TODO add ENFORCES to RelationshipClass
  "ENFORCES" as RelationshipClass,
  Entities.PREVENTION_POLICY._type,
  Entities.PROTECTION_SERVICE._type,
);
