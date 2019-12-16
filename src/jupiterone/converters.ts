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
        _key: integrationInstance.id,
        name: integrationInstance.name,
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

export const PREVENTION_POLICY_ENTITY_TYPE = "crowdstrike_sensor_policy";

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

export const DEVICE_PREVENTION_POLICY_RELATIONSHIP_TYPE = generateRelationshipType(
  "ASSIGNED",
  DEVICE_ENTITY_TYPE,
  PREVENTION_POLICY_ENTITY_TYPE,
);
