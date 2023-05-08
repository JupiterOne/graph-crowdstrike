# v3.2.4 (Thu May 04 2023)

#### 🐛 Bug Fix

- INT-7939: improvements (2) - Log request times
  [#148](https://github.com/JupiterOne/graph-crowdstrike/pull/148)
  ([@gastonyelmini](https://github.com/gastonyelmini))
- INT-7809 GitHub actions integration deployment workflow
  [#149](https://github.com/JupiterOne/graph-crowdstrike/pull/149)
  ([@jroblesx](https://github.com/jroblesx))

#### Authors: 2

- Gaston Yelmini ([@gastonyelmini](https://github.com/gastonyelmini))
- Jean R. Robles G. ([@jroblesx](https://github.com/jroblesx))

---

# v3.2.1 (Thu Apr 27 2023)

#### 🐛 Bug Fix

- INT-7809 Adding auto versioning
  [#146](https://github.com/JupiterOne/graph-crowdstrike/pull/146)
  ([@jroblesx](https://github.com/jroblesx))
- INT-6631: add ingest all vulnerabilities config
  [#144](https://github.com/JupiterOne/graph-crowdstrike/pull/144)
  ([@gastonyelmini](https://github.com/gastonyelmini))

#### Authors: 2

- Gaston Yelmini ([@gastonyelmini](https://github.com/gastonyelmini))
- Jean R. Robles G. ([@jroblesx](https://github.com/jroblesx))

---

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.2.1] - 2023-04-27

### Added

- Added `auto` package to help with builds, versioning and npm packaging.

## [3.2.0] - 2023-01-23

### Added

The following entity is **now** created:

| Resources   | Entity `_type`                     | Entity `_class` |
| ----------- | ---------------------------------- | --------------- |
| Application | `crowdstrike_detected_application` | `Application`   |

The following relationship is **now** created:

| Source Entity `_type`              | Relationship `_class` | Target Entity `_type`       |
| ---------------------------------- | --------------------- | --------------------------- |
| `crowdstrike_detected_application` | **HAS**               | `crowdstrike_vulnerability` |

## [3.1.2] - 2022-01-05

### Changed

- Collection period for devices extended to 50 days from 30.

## Added

- Added config properties for `vulnerabilitiesLimit` and `devicesLimit`.

## [3.1.1] - 2022-01-01

### Changed

- Add `exprtRating` and `exploitStatus` to `crowdstrike_vulnerability`.
- Raise vulnerability endpoint limit to `400`.

## [3.1.0] - 2022-09-23

### Changed

- Now using the `v2` devices api endpoint.

## [3.0.3] - 2022-08-29

### Changed

- set default vulnerabilities to be CRITICAL HIGH MEDIUM and UNKNOWN.

## [3.0.2] - 2022-08-24

### Changed

- preproces vulnerabilities to remove whitespace

## [3.0.1] - 2022-08-15

### Chagned

- include all vulnerabilties by default

## [3.0.0] - 2022-08-10

### Added

- Added the ability to filter vulnerabilities by `closed` status and by
  vulnerability `severity`.
  - `closed` vulnerabilities will be filtered by default. They can be included
    by passing the `INCLUDE_CLOSED_VULNERABILITIES` environment variable with
    the value `true`.
  - `LOW` and `NONE` level severities will be excluded by default. The included
    vulnerability severities can be configured by passing comma separated
    severities (e.g. "CRITICAL,HIGH,MEDIUM,LOW,NONE,UNKNOWN") in the environment
    variable `VULNERABILITY_SEVERITIES`.

### Changed

- Various code style and quality updates

## [2.2.6] - 2022-08-01

### Fixed

- corrected creation of query parameters to only include pagination details at
  most once and default to using details returned by the CrowdStrike API

## [2.2.5] - 2022-08-01

### Changed

- increase page size to 250 for devices, prevention policy, and prevention
  policy members endpoints

## [2.2.4] - 2022-07-28

### Changed

- log all errors during pagiation

## [2.2.3] - 2022-07-27

### Changed

- increased page size to 250 when fetching vulnerabilities
- removed `await` from `hasKey` operations
- added `return` after `abort()` during error handling

## [2.2.2] - 2022-07-08

### Fixed

- Handle redirects manually. Dependabot node-fetch upgrade removed auth headers
  when redirecting.

## [2.2.1] - 2022-06-28

### Fixed

- `crowdstrike_sensor`'s should map to `aws_instance` entities when the
  CrowdStrike device's `service_provider` property has the value `AWS_EC2_V2`

## [2.2.0] - 2022-06-09

### Added

- The integration now allows users to optionally specify an availability zone in
  the configuration.

## [2.1.11] - 2022-06-03

### Fixed

- Fixed incorrect relationship `_type`. `crowdstrike_vuln_exploits_sensor` was
  renamed to `crowdstrike_vulnerability_exploits_sensor`. This allows the
  `partial` flag to be appropriately applied to the relationship.

## [2.1.10] - 2022-05-25

### Changed

- Enable Vulnerability ingestion for all accounts. If permissions are not
  enabled for vuln endpoints, warning is published to the event log.
- Removed getStepStartStates.ts

## [2.1.9] - 2022-05-24

### Changed

- Added error logging to the `FalconAPIClient`

## [2.1.8] - 2022-05-13

### Changed

- Added improved error retry logic.
- Added validateInvocation logic. Thanks [jakopako](https://github.com/jakopako)
  for your contribution!

## [2.1.7] - 2022-05-06

### Added

- `code-ql` workflow
- `quesitons` workflow
- managed questions

## [2.1.6] - 2022-04-26

### Changed

- `createFalconAPIClient` now follows a singleton pattern. This allows multiple
  steps to run independently and share the single api rate limit.

## [2.1.5] - 2022-04-18

### Changed

- Change the \_class designation of the vulnerability entity from
  `Vulnerability` to `Finding`.
- Add additional properties to the vulnerability entity, including: `id`, `cid`,
  `aid`, `name`, `displayName`, `cveId`

## [2.1.4] - 2022-04-12

### Fixed

- Typo in pagination query.

## [2.1.3] - 2022-04-11

### Fixed

- Fixed pagination of vulnerabilities, enhanced logging around vulnerabilities
  step

## [2.1.1] - 2022-04-07

### Fixed

- Prevent duplicate `crowdstrike_vulnerability` entities and relationships from
  being submitted

## [2.1.0] - 2022-03-31

### Added

- Added vulnerability step ingestion from the Crowdstrike Spotlight API

## [2.0.9] - 2022-01-26

- Update sdk-\* packages to 8.2.1

## [2.0.8] - 2021-10-20

- Improved waiting logic after encountering 429 errors

## [2.0.7] - 2021-10-19

- Attempted waiting an additional 60s after the first 429 encountered

## [2.0.6] - 2021-10-15

- Fixed the way we calculate `expiresAt` for API tokens

## [2.0.5] - 2021-10-07

### Fixed

- Fixed retry logic after encountering 429 rate limit errors. Previously, the
  `x-ratelimit-retryafter` header was not properly respected because the header
  returned an epoch time in seconds, and we compared this to the current epoch
  time in milliseconds.

## [2.0.4] - 2021-08-30

### Removed

- Removed event emitter from `FalconAPIClient`
- Removed unused pagination parameters from `FalconAPIClient`

### Fixed

- Prevent malformed requests to
  `https://api.crowdstrike.com/devices/entities/devices/v1?` when _no_ devices
  have been found.

## [2.0.3] - 2021-08-27

### Fixed

- Prevent duplicate `crowdstrike_sensor` **ASSIGNED**
  `crowdstrike_prevention_policy` relationships from being created

## [2.0.2] - 2021-08-27

### Fixed

- Bumped `@jupiteron/integration-sdk-core@6.16.1` to incorporate
  `RelationshipClass.ENFORCES` from `@jupiterone/data-model@0.36.0`

## [2.0.1] - 2021-08-27

### Fixed

- Fixed bug where `accountEntity` and `protectionServiceEntity` singletons were
  not added to `jobState.setData()`

## [2.0.0] - 2021-08-26

### Changed

- Transitioned project from using `@jupiterone/jupiter-managed-integration-sdk`
  to open-source `@jupiterone/integration-sdk-*` packages

## 1.4.1 - 2021-08-26

### Fixed

- Do not fetch old `crowdstrike_sensor_protects_device` relationships

## 1.4.0 - 2021-08-06

### Added

- Add `ec2InstanceArn` property on `crowdstrike_sensor`

## 1.3.2 - 2021-08-04

### Fixed

- Retry API requests that respond with a `500` status code

## 1.3.0 - 2021-08-04

### Changed

- Remove `crowdstrike_sensor` **PROTECTS** `user_endpoint` relationship in favor
  of a managed mapping rule

## 1.2.0 - 2021-07-30

### Added

- Add normalized `macAddress` target filter key for building
  `crowdstrike_sensor` **PROTECTS** `user_endpoint` mapped relationship

## 1.1.6 - 2021-07-29

### Added

- Added logging to Crowdstrike Client for 429 responses
