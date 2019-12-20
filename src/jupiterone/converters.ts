import {
  createIntegrationEntity,
  EntityFromIntegration,
  generateRelationshipType,
  IntegrationInstance,
} from "@jupiterone/jupiter-managed-integration-sdk";

import { Device, PreventionPolicy } from "../crowdstrike/types";

export const ACCOUNT_ENTITY_TYPE = "crowdstrike_account";

export function createAccountEntity(
  integrationInstance: IntegrationInstance,
): EntityFromIntegration {
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

export function createProtectionServiceEntity(
  integrationInstance: IntegrationInstance,
): EntityFromIntegration {
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

export const DEVICE_ENTITY_TYPE = "crowdstrike_sensor";

export function createDeviceHostAgentEntity(
  source: Device,
): EntityFromIntegration {
  return createIntegrationEntity({
    entityData: {
      source,
      assign: {
        _class: "HostAgent",
        _type: DEVICE_ENTITY_TYPE,
        _key: source.device_id,
        name: source.hostname,
        function: ["anti-malware"],
      },
    },
  });
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

export const ACCOUNT_DEVICE_RELATIONSHIP_TYPE = generateRelationshipType(
  "HAS",
  ACCOUNT_ENTITY_TYPE,
  DEVICE_ENTITY_TYPE,
);

export const DEVICE_PREVENTION_POLICY_RELATIONSHIP_TYPE = generateRelationshipType(
  "ASSIGNED",
  DEVICE_ENTITY_TYPE,
  PREVENTION_POLICY_ENTITY_TYPE,
);

export const PREVENTION_POLICY_ENFORCES_PROTECTION_RELATIONSHIP_TYPE = generateRelationshipType(
  "ENFORCES",
  PREVENTION_POLICY_ENTITY_TYPE,
  PROTECTION_SERVICE_ENTITY_TYPE,
);
