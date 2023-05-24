# CrowdStrike

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

## Support

The query used to ingest vulnerabilities limits to the date/time of the last
successful integration or to the last 30 days for the initial run. Similarly,
only crowdstrike_sensors seen by CrowdStrike in the last 30 days will be
ingested.

If you need help with this integration, please contact
[JupiterOne Support](https://support.jupiterone.io).

## Integration Walkthrough

### In CrowdStrike

CrowdStrike Falcon provides [detailed instructions on creating API
credentials][1].

At a minimum, please provide Read access to the following API Scopes:

- Hosts
- Prevention policies
- Zero Trust Assessments

An additional scope is needed for ingesting vulnerabilities (Spotlight
Vulnerabilities). Future additions may require other scopes.

### In JupiterOne

1. From the top navigation of the J1 Search homepage, select **Integrations**.
2. Scroll to the **CrowdStrike** integration tile and click it.
3. Click the **Add Configuration** button and configure the following settings:

- Enter the **Account Name** by which you'd like to identify this CrowdStrike
  account in JupiterOne. Ingested entities will have this value stored in
  `tag.AccountName` when **Tag with Account Name** is checked.
- Enter a **Description** that will further assist your team when identifying
  the integration instance.
- Select a **Polling Interval** that you feel is sufficient for your monitoring
  needs. You may leave this as `DISABLED` and manually execute the integration.
- Enter the **API client ID** used to authenticate with the CrowdStrike
  _**Falcon**_ and _**Spotlight**_ APIs.
- Enter the **API client secret** used to authenticate with the CrowdStrike
  _**Falcon**_ and _**Spotlight**_ APIs.
- Enter the **Availability Zone** you'd like to use for API calls. Leave blank
  to use the main API endpoint. For example, entering `us-2` as the availability
  zone will result in the use of a CrowdStrike API endpoint of
  `api.us-2.crowdstrike.com`

4. Click **Create Configuration** once all values are provided.

## How to Uninstall

1. From the top navigation of the J1 Search homepage, select **Integrations**.
2. Scroll to the **CrowdStrike** integration tile and click it.
3. Identify and click the **integration to delete**.
4. Click the **trash can** icon.
5. Click the **Remove** button to delete the integration.

[1]: https://www.crowdstrike.com/blog/tech-center/get-access-falcon-apis/

<!-- {J1_DOCUMENTATION_MARKER_START} -->
<!--
********************************************************************************
NOTE: ALL OF THE FOLLOWING DOCUMENTATION IS GENERATED USING THE
"j1-integration document" COMMAND. DO NOT EDIT BY HAND! PLEASE SEE THE DEVELOPER
DOCUMENTATION FOR USAGE INFORMATION:

https://github.com/JupiterOne/sdk/blob/main/docs/integrations/development.md
********************************************************************************
-->

## Data Model

### Entities

The following entities are created:

| Resources             | Entity `_type`                      | Entity `_class` |
| --------------------- | ----------------------------------- | --------------- |
| Account               | `crowdstrike_account`               | `Account`       |
| Application           | `crowdstrike_detected_application`  | `Application`   |
| Device Sensor Agent   | `crowdstrike_sensor`                | `HostAgent`     |
| Prevention Policy     | `crowdstrike_prevention_policy`     | `ControlPolicy` |
| Service               | `crowdstrike_endpoint_protection`   | `Service`       |
| Vulnerability         | `crowdstrike_vulnerability`         | `Finding`       |
| Zero Trust Assessment | `crowdstrike_zero_trust_assessment` | `Assessment`    |

### Relationships

The following relationships are created:

| Source Entity `_type`              | Relationship `_class` | Target Entity `_type`             |
| ---------------------------------- | --------------------- | --------------------------------- |
| `crowdstrike_account`              | **HAS**               | `crowdstrike_endpoint_protection` |
| `crowdstrike_account`              | **HAS**               | `crowdstrike_sensor`              |
| `crowdstrike_detected_application` | **HAS**               | `crowdstrike_vulnerability`       |
| `crowdstrike_prevention_policy`    | **ENFORCES**          | `crowdstrike_endpoint_protection` |
| `crowdstrike_sensor`               | **ASSIGNED**          | `crowdstrike_prevention_policy`   |
| `crowdstrike_vulnerability`        | **EXPLOITS**          | `crowdstrike_sensor`              |

<!--
********************************************************************************
END OF GENERATED DOCUMENTATION AFTER BELOW MARKER
********************************************************************************
-->
<!-- {J1_DOCUMENTATION_MARKER_END} -->
