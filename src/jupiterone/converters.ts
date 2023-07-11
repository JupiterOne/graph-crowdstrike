import {
  convertProperties,
  createIntegrationEntity,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';
import { Entities } from '../steps/constants';

import {
  Application,
  Device,
  PreventionPolicy,
  Vulnerability,
  ZeroTrustAssessment,
} from '../crowdstrike/types';

function toCapitalCase(s: string): string {
  return s.toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function normalizeMacAddress(macAddress: string): string {
  return macAddress.replace(/-/g, ':').toLowerCase();
}

export function createAccountEntity(integrationInstance: {
  id: string;
  name: string;
}) {
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
}) {
  return createIntegrationEntity({
    entityData: {
      source: {},
      assign: {
        _class: Entities.PROTECTION_SERVICE._class,
        _type: Entities.PROTECTION_SERVICE._type,
        _key: `${Entities.PROTECTION_SERVICE._type}|${integrationInstance.id}`,
        name: 'CrowdStrike Endpoint Protection Service',
        category: ['software', 'other'],
        endpoints: ['https://falcon.crowdstrike.com/'],
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

function isAwsEc2Device(source: Device): boolean {
  const {
    service_provider: serviceProvider, // Ex. AWS_EC2, AWS_EC2_V2
    service_provider_account_id: serviceProviderAccountId, // Ex. 123456789
    zone_group: zoneGroup, // Ex. us-east-1d
  } = source;

  return !!(
    typeof serviceProvider === 'string' &&
    serviceProvider.startsWith('AWS_EC2') &&
    serviceProviderAccountId &&
    zoneGroup
  );
}

export function buildEc2InstanceArn(source: Device): string | undefined {
  const {
    service_provider_account_id: serviceProviderAccountId, // Ex. 123456789
    zone_group: zoneGroup, // Ex. us-east-1d
    instance_id: instanceId, // i-1234567
  } = source;

  if (!isAwsEc2Device(source)) return;
  const region = zoneGroupToRegion(zoneGroup as string);

  // arn:aws:ec2:us-east-1:123456789:instance/i-1234567
  return `arn:aws:ec2:${region}:${serviceProviderAccountId}:instance/${instanceId}`;
}

export function createSensorAgentEntity(source: Device) {
  return createIntegrationEntity({
    entityData: {
      source,
      assign: {
        ...convertProperties(source),
        _class: Entities.SENSOR._class,
        _type: Entities.SENSOR._type,

        // Crowdstrike's device ID for sensors will change when the sensor
        // version is upgraded.  This is listed in their API documentation
        // and it notes that this means that it's a valid case for a Host to
        // potentially have multiple sensors protecting it.
        _key: source.device_id,
        name: source.hostname,
        function: ['anti-malware', 'activity-monitor'],
        firstSeenOn: parseTimePropertyValue(source.first_seen),
        lastSeenOn: parseTimePropertyValue(source.last_seen),
        active: source.status === 'normal',

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

export function createPreventionPolicyEntity(source: PreventionPolicy) {
  return createIntegrationEntity({
    entityData: {
      source,
      assign: {
        _class: Entities.PREVENTION_POLICY._class,
        _type: Entities.PREVENTION_POLICY._type,
        _key: source.id,
        createdOn: Date.parse(source.created_timestamp),
        updatedOn: Date.parse(source.modified_timestamp),
        createdBy: source.created_by,
        updatedBy: source.modified_by,
        active: source.enabled,
      },
    },
  });
}

/**
 * Example Vuln response:
 * {
 *     "id": "feb24177xxxxxxxxxxc48ce11cb_d97920959227xxxxxxxxxx88ed0f",
 *     "cid": "3b12658xxxxxxxxxx5141e3ace49",
 *     "aid": "feb241773xxxxxxxxxbc48ce11cb",
 *     "created_timestamp": "2021-03-11T21:04:22Z",
 *     "updated_timestamp": "2021-03-11T21:04:22Z",
 *     "status": "open",
 *     "apps": [
 *       {
 *         "product_name_version": "kernel 4.NNN.XXX-140.257.ggl2",
 *         "sub_status": "closed",
 *         "remediation": { "ids": ["1ba86040xxxxxxxxxxx45d9de2705"] },
 *         "evaluation_logic": { "id": "" }
 *       }
 *     ],
 *     "cve": { "id": "CVE-2021-23444",
 *              "vendor_advisory": [
 *                "https://docs.microsoft.com/en-us/security-updates/securitybulletins/2013/ms13-098",
 *                "https://msrc.microsoft.com/update-guide/vulnerability/CVE-2013-3900",
 *                ] }
 *      }
 * @param source
 */
export function createVulnerabilityEntity(source: Vulnerability) {
  const cve = source.cve;
  const cveId = cve?.id;

  return createIntegrationEntity({
    entityData: {
      source,
      assign: {
        _class: Entities.VULNERABILITY._class,
        _type: Entities.VULNERABILITY._type,
        _key: source.id,
        createdOn: parseTimePropertyValue(source.created_timestamp),
        closedOn: parseTimePropertyValue(source.closed_timestamp),
        updatedOn: parseTimePropertyValue(source.updated_timestamp),
        id: source.id,
        cid: source.cid,
        aid: source.aid,
        name: cveId,
        displayName: cveId,
        status: source.status,
        score: cve?.base_score,
        description: cve?.description,
        severity: cve?.severity ? toCapitalCase(cve.severity) : undefined,
        publishedOn: parseTimePropertyValue(cve?.published_date),
        exploitability: cve?.exploitability_score,
        public: true,
        impact: cve.impact_score,
        vector: cve?.vector,
        vendorAdvisory: cve.vendor_advisory,
        references: cve.references,
        webLink: cve.references?.length ? cve.references[0] : undefined,
        open: source.status.includes('open'), // matches open and reopen
        cveId,
        exploitStatus: cve?.exploit_status,
        exprtRating: cve?.exprt_rating,
        productNameVersion: source.apps?.length
          ? source.apps[0].product_name_version
          : undefined,
        // TODO: Consider additional properties: remediation..
      },
    },
  });
}

export function createApplicationEntity(source: Application) {
  return createIntegrationEntity({
    entityData: {
      source,
      assign: {
        _class: Entities.APPLICATION._class,
        _type: Entities.APPLICATION._type,
        _key: source.product_name_version.toLowerCase().replace(/\s/g, '-'),
        name: source.product_name_version,
        open: source.sub_status.toLowerCase() === 'open',
        remediationIds: source.remediation?.ids,
        evaluationLogicId: source.evaluation_logic.id,
      },
    },
  });
}
export function createZeroTrustAssessmentEntity(source: ZeroTrustAssessment) {
  const unmet_os_signals = source.assessment_items.os_signals.filter(
    (s) => s.meets_criteria == 'no',
  );
  const met_os_signals = source.assessment_items.os_signals.filter(
    (s) => s.meets_criteria == 'yes',
  );
  const unmet_sensor_signals = source.assessment_items.sensor_signals.filter(
    (s) => s.meets_criteria == 'no',
  );
  const met_sensor_signals = source.assessment_items.sensor_signals.filter(
    (s) => s.meets_criteria == 'yes',
  );
  return createIntegrationEntity({
    entityData: {
      source,
      assign: {
        _class: Entities.ZERO_TRUST_ASSESSMENT._class,
        _type: Entities.ZERO_TRUST_ASSESSMENT._type,
        _key: `${Entities.ZERO_TRUST_ASSESSMENT._type}|${source.aid}`,
        updatedOn: parseTimePropertyValue(source.modified_time),
        cid: source.cid,
        aid: source.aid,
        product_type_description: source.product_type_desc,
        sensor_file_status: source.sensor_file_status,
        system_serial_number: source.system_serial_number,
        sensor_config_score: source.assessment.sensor_config,
        os_score: source.assessment.os,
        overall_score: source.assessment.overall,
        version: source.assessment.version,
        event_platform: source.event_platform,
        met_sensor_signals: met_sensor_signals.map((s) => s.signal_id),
        unmet_sensor_signals: unmet_sensor_signals.map((s) => s.signal_id),
        met_os_signals: met_os_signals.map((s) => s.signal_id),
        unmet_os_signals: unmet_os_signals.map((s) => s.signal_id),
      },
    },
  });
}
