import {
  EntityFromIntegration,
  GraphClient,
  IntegrationExecutionContext,
  PersisterClient,
} from "@jupiterone/jupiter-managed-integration-sdk";
import ProviderClient from "./ProviderClient";

export const ACCOUNT_ENTITY_TYPE = "provider_account";
export const ACCOUNT_ENTITY_CLASS = "Account";

export const USER_ENTITY_TYPE = "provider_user";
export const USER_ENTITY_CLASS = "User";
export const ACCOUNT_USER_RELATIONSHIP_TYPE = "provider_account_user";

export const DEVICE_ENTITY_TYPE = "provider_device";
export const DEVICE_ENTITY_CLASS = "Device";
export const ACCOUNT_DEVICE_RELATIONSHIP_TYPE = "provider_account_device";

export const USER_DEVICE_RELATIONSHIP_TYPE = "provider_user_device";
export const USER_DEVICE_RELATIONSHIP_CLASS = "HAS";

export interface AccountEntity extends EntityFromIntegration {
  accountId: string;
}

export interface UserEntity extends EntityFromIntegration {
  userId: string;
}

export interface DeviceEntity extends EntityFromIntegration {
  deviceId: string;
  ownerId: string;
}

export interface ExampleExecutionContext extends IntegrationExecutionContext {
  graph: GraphClient;
  persister: PersisterClient;
  provider: ProviderClient;
}
