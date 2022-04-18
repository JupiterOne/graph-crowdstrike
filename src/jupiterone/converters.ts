import {
  convertProperties,
  createIntegrationEntity,
  getTime,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';
import { Entities } from '../constants';

import { Device, PreventionPolicy, Vulnerability } from '../crowdstrike/types';

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

export function buildEc2InstanceArn(source: Device): string | undefined {
  const {
    service_provider: serviceProvider, // Ex. AWS_EC2
    service_provider_account_id: serviceProviderAccountId, // Ex. 123456789
    zone_group: zoneGroup, // Ex. us-east-1d
    instance_id: instanceId, // i-1234567
  } = source;

  if (
    serviceProvider !== 'AWS_EC2' ||
    !serviceProviderAccountId ||
    !zoneGroup
  ) {
    return;
  }

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
        _key: source.device_id,
        name: source.hostname,
        function: ['anti-malware', 'activity-monitor'],
        firstSeenOn: getTime(source.first_seen),
        lastSeenOn: getTime(source.last_seen),
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
 *     "cve": { "id": "CVE-2021-23444" }
 *   }
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
        cveBaseScore: cve?.base_score,
        cveDescription: cve?.description,
        cveSeverity: cve?.severity,
        cvePublishedDate: cve?.published_date,
        cveId,
        // TODO: Consider additional properties: webLink, apps, remediation
      },
    },
  });
}
