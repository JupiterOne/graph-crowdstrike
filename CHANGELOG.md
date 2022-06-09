# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
