import {
  createIntegrationEntity,
  EntityFromIntegration,
  IntegrationInstance,
} from "@jupiterone/jupiter-managed-integration-sdk";
import { Device } from "../crowdstrike/types";

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
