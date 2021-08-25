import { RelationshipClass } from "@jupiterone/integration-sdk-core";

export const SetDataKeys = {
  ACCOUNT_ENTITY: "ACCOUNT_ENTITY",
};

export const StepIds = {
  ACCOUNT: "get-account",
  DEVICES: "fetch-devices",
};

export const Entities = {
  ACCOUNT: {
    resourceName: "Account",
    _type: "crowdstrike_account",
    _class: "Account",
  },
  PROTECTION_SERVICE: {
    resourceName: "Service",
    _type: "crowdstrike_endpoint_protection",
    _class: "Service",
  },
  SENSOR: {
    resourceName: "Device Sensor Agent",
    _type: "crowdstrike_sensor",
    _class: "HostAgent",
  },
};

export const Relationships = {
  ACCOUNT_HAS_PROTECTION_SERVICE: {
    _type: "crowdstrike_account_has_endpoint_protection",
    sourceType: Entities.ACCOUNT._type,
    _class: RelationshipClass.HAS,
    targetType: Entities.PROTECTION_SERVICE._type,
  },
  ACCOUNT_HAS_SENSOR: {
    _type: "crowdstrike_account_has_sensor",
    sourceType: Entities.ACCOUNT._type,
    _class: RelationshipClass.HAS,
    targetType: Entities.SENSOR._type,
  },
};
