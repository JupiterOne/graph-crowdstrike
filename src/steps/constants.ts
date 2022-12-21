import {
  RelationshipClass,
  StepEntityMetadata,
  StepRelationshipMetadata,
} from '@jupiterone/integration-sdk-core';

export const SetDataKeys = {
  ACCOUNT_ENTITY: 'ACCOUNT_ENTITY',
  PROTECTION_SERVICE_ENTITY: 'PROTECTION_SERVICE_ENTITY',
};

export const StepIds: Record<
  | 'ACCOUNT'
  | 'DEVICES'
  | 'PREVENTION_POLICIES'
  | 'VULNERABILITIES'
  | 'DEVICE_POLICY_RELATIONSHIPS',
  string
> = {
  ACCOUNT: 'get-account',
  DEVICES: 'fetch-devices',
  PREVENTION_POLICIES: 'fetch-prevention-policies',
  DEVICE_POLICY_RELATIONSHIPS: 'fetch-device-policies',
  VULNERABILITIES: 'fetch-vulnerabilities',
};

export const Entities: Record<
  | 'ACCOUNT'
  | 'PROTECTION_SERVICE'
  | 'SENSOR'
  | 'PREVENTION_POLICY'
  | 'VULNERABILITY'
  | 'APPLICATION',
  StepEntityMetadata
> = {
  ACCOUNT: {
    resourceName: 'Account',
    _type: 'crowdstrike_account',
    _class: ['Account'],
  },
  PROTECTION_SERVICE: {
    resourceName: 'Service',
    _type: 'crowdstrike_endpoint_protection',
    _class: ['Service'],
  },
  SENSOR: {
    resourceName: 'Device Sensor Agent',
    _type: 'crowdstrike_sensor',
    _class: ['HostAgent'],
  },
  PREVENTION_POLICY: {
    resourceName: 'Prevention Policy',
    _type: 'crowdstrike_prevention_policy',
    _class: ['ControlPolicy'],
  },
  VULNERABILITY: {
    resourceName: 'Vulnerability',
    _type: 'crowdstrike_vulnerability',
    _class: ['Finding'], // J1 data model considers CrowdStrike vulns as Findings. Note: this changes the billing of the entity
    partial: true,
  },
  APPLICATION: {
    resourceName: 'Application',
    // this isn't really crowdstrike application, should we use mapped relationship and target some globally unique application instead?
    _type: 'crowdstrike_application',
    _class: ['Application'],
  },
};

export const Relationships: Record<
  | 'ACCOUNT_HAS_PROTECTION_SERVICE'
  | 'ACCOUNT_HAS_SENSOR'
  | 'PREVENTION_POLICY_ENFORCES_PROTECTION_SERVICE'
  | 'SENSOR_ASSIGNED_PREVENTION_POLICY'
  | 'VULN_EXPLOITS_SENSOR'
  | 'APP_HAS_VULN',
  StepRelationshipMetadata
> = {
  ACCOUNT_HAS_PROTECTION_SERVICE: {
    _type: 'crowdstrike_account_has_endpoint_protection',
    sourceType: Entities.ACCOUNT._type,
    _class: RelationshipClass.HAS,
    targetType: Entities.PROTECTION_SERVICE._type,
  },
  ACCOUNT_HAS_SENSOR: {
    _type: 'crowdstrike_account_has_sensor',
    sourceType: Entities.ACCOUNT._type,
    _class: RelationshipClass.HAS,
    targetType: Entities.SENSOR._type,
  },
  PREVENTION_POLICY_ENFORCES_PROTECTION_SERVICE: {
    _type: 'crowdstrike_prevention_policy_enforces_endpoint_protection',
    sourceType: Entities.PREVENTION_POLICY._type,
    _class: RelationshipClass.ENFORCES,
    targetType: Entities.PROTECTION_SERVICE._type,
  },
  SENSOR_ASSIGNED_PREVENTION_POLICY: {
    _type: 'crowdstrike_sensor_assigned_prevention_policy',
    sourceType: Entities.SENSOR._type,
    _class: RelationshipClass.ASSIGNED,
    targetType: Entities.PREVENTION_POLICY._type,
  },
  VULN_EXPLOITS_SENSOR: {
    _type: 'crowdstrike_vulnerability_exploits_sensor',
    sourceType: Entities.VULNERABILITY._type,
    _class: RelationshipClass.EXPLOITS,
    targetType: Entities.SENSOR._type,
    partial: true,
  },
  APP_HAS_VULN: {
    _type: 'crowdstrike_application_has_vulnerability',
    sourceType: Entities.APPLICATION._type,
    _class: RelationshipClass.HAS,
    targetType: Entities.VULNERABILITY._type,
  },
};
