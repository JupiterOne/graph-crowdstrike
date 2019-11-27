import {
  IntegrationExecutionContext,
  IntegrationExecutionResult,
} from "@jupiterone/jupiter-managed-integration-sdk";
import {
  createAccountEntity,
  createAccountRelationships,
  createDeviceEntities,
  createUserDeviceRelationships,
  createUserEntities,
} from "./converters";
import initializeContext from "./initializeContext";
import ProviderClient from "./ProviderClient";
import {
  ACCOUNT_DEVICE_RELATIONSHIP_TYPE,
  ACCOUNT_ENTITY_TYPE,
  ACCOUNT_USER_RELATIONSHIP_TYPE,
  AccountEntity,
  DEVICE_ENTITY_TYPE,
  DeviceEntity,
  USER_DEVICE_RELATIONSHIP_TYPE,
  USER_ENTITY_TYPE,
  UserEntity,
} from "./types";

export default async function executionHandler(
  context: IntegrationExecutionContext,
): Promise<IntegrationExecutionResult> {
  const { graph, persister, provider } = initializeContext(context);

  const [
    oldAccountEntities,
    oldUserEntities,
    oldDeviceEntities,
    oldAccountRelationships,
    oldUserDeviceRelationships,
    newAccountEntities,
    newUserEntities,
    newDeviceEntities,
  ] = await Promise.all([
    graph.findEntitiesByType<AccountEntity>(ACCOUNT_ENTITY_TYPE),
    graph.findEntitiesByType<UserEntity>(USER_ENTITY_TYPE),
    graph.findEntitiesByType<DeviceEntity>(DEVICE_ENTITY_TYPE),
    graph.findRelationshipsByType([
      ACCOUNT_USER_RELATIONSHIP_TYPE,
      ACCOUNT_DEVICE_RELATIONSHIP_TYPE,
    ]),
    graph.findRelationshipsByType(USER_DEVICE_RELATIONSHIP_TYPE),
    fetchAccountEntitiesFromProvider(provider),
    fetchUserEntitiesFromProvider(provider),
    fetchDeviceEntitiesFromProvider(provider),
  ]);

  const [accountEntity] = newAccountEntities;
  const newAccountRelationships = [
    ...createAccountRelationships(
      accountEntity,
      newUserEntities,
      ACCOUNT_USER_RELATIONSHIP_TYPE,
    ),
    ...createAccountRelationships(
      accountEntity,
      newDeviceEntities,
      ACCOUNT_DEVICE_RELATIONSHIP_TYPE,
    ),
  ];

  const newUserDeviceRelationships = createUserDeviceRelationships(
    newUserEntities,
    newDeviceEntities,
  );

  return {
    operations: await persister.publishPersisterOperations([
      [
        ...persister.processEntities(oldAccountEntities, newAccountEntities),
        ...persister.processEntities(oldUserEntities, newUserEntities),
        ...persister.processEntities(oldDeviceEntities, newDeviceEntities),
      ],
      [
        ...persister.processRelationships(
          oldUserDeviceRelationships,
          newUserDeviceRelationships,
        ),
        ...persister.processRelationships(
          oldAccountRelationships,
          newAccountRelationships,
        ),
      ],
    ]),
  };
}

function fetchAccountEntitiesFromProvider(
  provider: ProviderClient,
): AccountEntity[] {
  return [createAccountEntity(provider.fetchAccountDetails())];
}

function fetchUserEntitiesFromProvider(provider: ProviderClient): UserEntity[] {
  return createUserEntities(provider.fetchUsers());
}

function fetchDeviceEntitiesFromProvider(
  provider: ProviderClient,
): DeviceEntity[] {
  return createDeviceEntities(provider.fetchDevices());
}
