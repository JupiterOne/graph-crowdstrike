import {
  EntityFromIntegration,
  RelationshipFromIntegration,
} from "@jupiterone/jupiter-managed-integration-sdk";
import { Account, Device, User } from "./ProviderClient";
import {
  ACCOUNT_ENTITY_CLASS,
  ACCOUNT_ENTITY_TYPE,
  AccountEntity,
  DEVICE_ENTITY_CLASS,
  DEVICE_ENTITY_TYPE,
  DeviceEntity,
  USER_DEVICE_RELATIONSHIP_CLASS,
  USER_DEVICE_RELATIONSHIP_TYPE,
  USER_ENTITY_CLASS,
  USER_ENTITY_TYPE,
  UserEntity,
} from "./types";

export function createAccountEntity(data: Account): AccountEntity {
  return {
    _class: ACCOUNT_ENTITY_CLASS,
    _key: `provider-account-${data.id}`,
    _type: ACCOUNT_ENTITY_TYPE,
    accountId: data.id,
    displayName: data.name,
  };
}

export function createUserEntities(data: User[]): UserEntity[] {
  return data.map(d => ({
    _class: USER_ENTITY_CLASS,
    _key: `provider-user-${d.id}`,
    _type: USER_ENTITY_TYPE,
    displayName: `${d.firstName} ${d.lastName}`,
    userId: d.id,
  }));
}

export function createDeviceEntities(data: Device[]): DeviceEntity[] {
  return data.map(d => ({
    _class: DEVICE_ENTITY_CLASS,
    _key: `provider-device-id-${d.id}`,
    _type: DEVICE_ENTITY_TYPE,
    deviceId: d.id,
    displayName: d.manufacturer,
    ownerId: d.ownerId,
  }));
}

export function createAccountRelationship(
  account: AccountEntity,
  entity: EntityFromIntegration,
  type: string,
): RelationshipFromIntegration {
  return {
    _class: "HAS",
    _fromEntityKey: account._key,
    _key: `${account._key}_has_${entity._key}`,
    _toEntityKey: entity._key,
    _type: type,
  };
}

export function createAccountRelationships(
  account: AccountEntity,
  entities: EntityFromIntegration[],
  type: string,
): RelationshipFromIntegration[] {
  const relationships = [];
  for (const entity of entities) {
    relationships.push(createAccountRelationship(account, entity, type));
  }

  return relationships;
}

function createUserDeviceRelationship(
  user: UserEntity,
  device: DeviceEntity,
): RelationshipFromIntegration {
  return {
    _class: USER_DEVICE_RELATIONSHIP_CLASS,
    _fromEntityKey: user._key,
    _key: `${user._key}_has_${device._key}`,
    _toEntityKey: device._key,
    _type: USER_DEVICE_RELATIONSHIP_TYPE,
  };
}

export function createUserDeviceRelationships(
  users: UserEntity[],
  devices: DeviceEntity[],
): RelationshipFromIntegration[] {
  const usersById: { [id: string]: UserEntity } = {};
  for (const user of users) {
    usersById[user.userId] = user;
  }

  const relationships = [];
  for (const device of devices) {
    const user = usersById[device.ownerId];
    relationships.push(createUserDeviceRelationship(user, device));
  }

  return relationships;
}
