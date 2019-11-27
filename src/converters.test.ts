import {
  createAccountEntity,
  createAccountRelationships,
  createDeviceEntities,
  createUserDeviceRelationships,
  createUserEntities,
} from "./converters";
import { Account, Device, User } from "./ProviderClient";
import {
  ACCOUNT_USER_RELATIONSHIP_TYPE,
  DEVICE_ENTITY_CLASS,
  DEVICE_ENTITY_TYPE,
  USER_DEVICE_RELATIONSHIP_CLASS,
  USER_DEVICE_RELATIONSHIP_TYPE,
  USER_ENTITY_CLASS,
  USER_ENTITY_TYPE,
} from "./types";

const account: Account = {
  id: "account-1",
  name: "account-name",
};

const users: User[] = [
  {
    firstName: "fname",
    id: "user-1",
    lastName: "lname",
  },
];

const devices: Device[] = [
  {
    id: "device-1",
    manufacturer: "man-1",
    ownerId: "user-1",
  },
];

test("createAccountRelationships", () => {
  const accountEntity = createAccountEntity(account);
  const userEntities = createUserEntities(users);

  expect(
    createAccountRelationships(
      accountEntity,
      userEntities,
      ACCOUNT_USER_RELATIONSHIP_TYPE,
    ),
  ).toEqual([
    {
      _class: "HAS",
      _fromEntityKey: "provider-account-account-1",
      _key: "provider-account-account-1_has_provider-user-user-1",
      _toEntityKey: "provider-user-user-1",
      _type: ACCOUNT_USER_RELATIONSHIP_TYPE,
    },
  ]);
});

test("createUserEntities", () => {
  expect(createUserEntities(users)).toEqual([
    {
      _class: USER_ENTITY_CLASS,
      _key: "provider-user-user-1",
      _type: USER_ENTITY_TYPE,
      displayName: "fname lname",
      userId: "user-1",
    },
  ]);
});

test("createDeviceEntities", () => {
  expect(createDeviceEntities(devices)).toEqual([
    {
      _class: DEVICE_ENTITY_CLASS,
      _key: "provider-device-id-device-1",
      _type: DEVICE_ENTITY_TYPE,
      deviceId: "device-1",
      displayName: "man-1",
      ownerId: "user-1",
    },
  ]);
});

test("createUserDeviceRelationships", () => {
  const userEntities = createUserEntities(users);
  const deviceEntities = createDeviceEntities(devices);
  expect(createUserDeviceRelationships(userEntities, deviceEntities)).toEqual([
    {
      _class: USER_DEVICE_RELATIONSHIP_CLASS,
      _fromEntityKey: "provider-user-user-1",
      _key: `provider-user-user-1_has_provider-device-id-device-1`,
      _toEntityKey: "provider-device-id-device-1",
      _type: USER_DEVICE_RELATIONSHIP_TYPE,
    },
  ]);
});
