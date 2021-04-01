# CrowdStrike Falcon

## Overview

The integration connects directly to CrowdStrike Falcon APIs to obtain account
metadata and analyze resource relationships. Customers authorize access by
creating Client API credentials in their CrowdStrike Falcon account and
providing those credentials when setting up an instance of the integration in
JupiterOne.

## CrowdStrike + JupiterOne Integration Benefits

- Visualize your CrowdStrike endpoint agents and the devices they protect in the
  JupiterOne graph.
- Map endpoint agents to devices and devices to the employee who is the owner.  
- Monitor changes to CrowdStrike endpoints using JupiterOne alerts.

## How it Works

- JupiterOne periodically fetches CrowdStrike agents and devices to update the
  graph.
- Write JupiterOne queries to review and monitor updates to the graph.
- Configure alerts to take action when the JupiterOne graph changes.

## Requirements

- JupiterOne requires an API client ID and client secret configured in your
  CrowdStrike account with the appropriate permissions. 
- You must have permission in JupiterOne to install new integrations.

## API Authentication

CrowdStrike Falcon provides [detailed instructions on creating an API
credentials][1].

## Entities

These entities are ingested when the integration runs:

| Example Entity Resource | \_type : \_class of the Entity                    |
| ----------------------- | ------------------------------------------------- |
| Account                 | `crowdstrike_account` : `Account`                 |
| Service                 | `crowdstrike_endpoint_protection` : `Service`     |
| Device Sensor Agent     | `crowdstrike_sensor` : `HostAgent`                |
| Prevention Policy       | `crowdstrike_prevention_policy` : `ControlPolicy` |

Only hosts that have been seen within past 30 days are maintained.

## Relationships

The following relationships are created/mapped:

| Relationships
|
| ------------------------------------------------------------------------------ |
| `crowdstrike_account` **HAS** `crowdstrike_sensor`
| | `crowdstrike_account` **HAS** `crowdstrike_endpoint_protection`
| | `crowdstrike_prevention_policy` **ENFORCES**
`crowdstrike_endpoint_protection` | | `crowdstrike_sensor` **ASSIGNED**
`crowdstrike_prevention_policy`              | | `crowdstrike_sensor`
**PROTECTS** `user_endpoint`                              |

[1]: https://www.crowdstrike.com/blog/tech-center/get-access-falcon-apis/
