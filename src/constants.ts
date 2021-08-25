import { RelationshipClass } from "@jupiterone/integration-sdk-core";

export const SetDataKeys = {
  ACCOUNT_ENTITY: "ACCOUNT_ENTITY",
  PROTECTION_SERVICE_ENTITY: "PROTECTION_SERVICE_ENTITY",
};

export const StepIds = {
  ACCOUNT: "get-account",
  DEVICES: "fetch-devices",
  PREVENTION_POLICIES: "fetch-prevention-policies",
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
  PREVENTION_POLICY: {
    resourceName: "Prevention Policy",
    _type: "crowdstrike_prevention_policy",
    _class: "ControlPolicy",
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
  PREVENTION_POLICY_ENFORCES_PROTECTION_SERVICE: {
    _type: "crowdstrike_prevention_policy_enforces_protection_service",
    sourceType: Entities.PREVENTION_POLICY._type,
    // TODO add ENFORCES to RelationshipClass
    _class: "ENFORCES" as RelationshipClass,
    targetType: Entities.PROTECTION_SERVICE._type,
  },
};
