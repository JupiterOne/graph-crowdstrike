# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- Removed event emitter from `FalconAPIClient`

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
