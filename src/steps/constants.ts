import {
  RelationshipClass,
  RelationshipDirection,
  StepEntityMetadata,
  StepMappedRelationshipMetadata,
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
  | 'DISCOVER_APPLICATIONS'
  | 'VULNERABILITIES'
  | 'DEVICE_POLICY_RELATIONSHIPS'
  | 'ZERO_TRUST_ASSESSMENT'
  | 'ZERO_TRUST_ASSESSMENT_SENSOR_RELATIONSHIPS'
  | 'VULN_EXPLOITS_SENSOR'
  | 'BUILD_VULNERABILITY_FINDING_CVE_RELATIONSHIPS',
  string
> = {
  ACCOUNT: 'get-account',
  DEVICES: 'fetch-devices',
  PREVENTION_POLICIES: 'fetch-prevention-policies',
  DISCOVER_APPLICATIONS: 'fetch-discover-applications',
  DEVICE_POLICY_RELATIONSHIPS: 'fetch-device-policies',
  VULNERABILITIES: 'fetch-vulnerabilities',
  ZERO_TRUST_ASSESSMENT: 'fetch-zero-trust-assessments',
  ZERO_TRUST_ASSESSMENT_SENSOR_RELATIONSHIPS: 'fetch_zta_sensor_relationships',
  VULN_EXPLOITS_SENSOR: 'build-vulnerability-expoits-sensor-relationship',
  BUILD_VULNERABILITY_FINDING_CVE_RELATIONSHIPS:
    'build-vulnerability-finding-cve-relationships',
};
type CrowdstrikeStepEntityMetadata = StepEntityMetadata & {
  disableClassMatch?: boolean;
};
export const Entities: Record<
  | 'ACCOUNT'
  | 'PROTECTION_SERVICE'
  | 'SENSOR'
  | 'PREVENTION_POLICY'
  | 'VULNERABILITY'
  | 'DETECTED_APPLICATION'
  | 'ZERO_TRUST_ASSESSMENT'
  | 'DISCOVER_APPLICATION',
  CrowdstrikeStepEntityMetadata
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
  DETECTED_APPLICATION: {
    resourceName: 'Application',
    _type: 'crowdstrike_detected_application',
    _class: ['Application'],
  },
  ZERO_TRUST_ASSESSMENT: {
    resourceName: 'Zero Trust Assessment',
    _type: 'crowdstrike_zero_trust_assessment',
    _class: ['Assessment'],
    disableClassMatch: true,
  },
  DISCOVER_APPLICATION: {
    resourceName: 'Discover Application',
    _type: 'crowdstrike_discover_application',
    _class: ['Application'],
  },
};

export const Relationships: Record<
  | 'ACCOUNT_HAS_PROTECTION_SERVICE'
  | 'ACCOUNT_HAS_SENSOR'
  | 'PREVENTION_POLICY_ENFORCES_PROTECTION_SERVICE'
  | 'SENSOR_ASSIGNED_PREVENTION_POLICY'
  | 'SENSOR_HAS_DISCOVER_APPLICATION'
  | 'VULN_EXPLOITS_SENSOR'
  | 'APP_HAS_VULN'
  | 'SENSOR_HAS_ZERO_TRUST_ASSESSMENT',
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
  SENSOR_HAS_DISCOVER_APPLICATION: {
    _type: 'crowdstrike_sensor_has_discover_application',
    sourceType: Entities.SENSOR._type,
    _class: RelationshipClass.HAS,
    targetType: Entities.DISCOVER_APPLICATION._type,
  },
  VULN_EXPLOITS_SENSOR: {
    _type: 'crowdstrike_vulnerability_exploits_sensor',
    sourceType: Entities.VULNERABILITY._type,
    _class: RelationshipClass.EXPLOITS,
    targetType: Entities.SENSOR._type,
    partial: true,
  },
  APP_HAS_VULN: {
    _type: 'crowdstrike_detected_application_has_vulnerability',
    sourceType: Entities.DETECTED_APPLICATION._type,
    _class: RelationshipClass.HAS,
    targetType: Entities.VULNERABILITY._type,
    partial: true,
  },
  SENSOR_HAS_ZERO_TRUST_ASSESSMENT: {
    _type: 'crowdstrike_sensor_has_zero_trust_assessment',
    sourceType: Entities.SENSOR._type,
    _class: RelationshipClass.HAS,
    targetType: Entities.ZERO_TRUST_ASSESSMENT._type,
  },
};

export const MappedRelationships: Record<
  'VULN_IS_CVE',
  StepMappedRelationshipMetadata
> = {
  VULN_IS_CVE: {
    _type: 'crowdstrike_vulnerability_is_cve',
    sourceType: 'crowdstrike_vulnerability',
    _class: RelationshipClass.IS,
    targetType: 'cve',
    direction: RelationshipDirection.FORWARD,
  },
};
