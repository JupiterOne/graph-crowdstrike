import {
  createIntegrationRelationship,
  IntegrationError,
  IntegrationInvocationConfig,
  IntegrationRelationship,
  IntegrationStepExecutionContext,
  IntegrationStepExecutionResult,
  IntegrationStepIterationState,
  EntityFromIntegration,
  IntegrationCache,
  EntityOperation,
  summarizePersisterOperationsResults,
  PersisterOperationsResult,
  RelationshipOperation,
  generateRelationshipType,
} from "@jupiterone/jupiter-managed-integration-sdk";

import { FalconAPIClient } from "./crowdstrike";
import invocationValidator from "./invocationValidator";
import {
  createAccountEntity,
  createDeviceHostAgentEntity,
  ACCOUNT_ENTITY_TYPE,
  DEVICE_ENTITY_TYPE,
} from "./jupiterone/converters";

interface KeyIteratorCallback<EntryType> {
  (
    key: string,
    index: number,
    qty: number,
    getResource: () => Promise<EntryType>,
  ): Promise<void>;
}

/**
 * A cache of provider data, already converted to `EntityFromIntegration` and
 * `IntegrationRelationship` objects.
 */
class ProviderGraphObjectCache {
  constructor(private resourceCache: IntegrationCache) {}

  public async getAccount(): Promise<EntityFromIntegration> {
    const entry = await this.resourceCache.getEntry("account");
    if (!entry.data) {
      throw new IntegrationError("Account entity not found in cache!");
    }
    return entry.data;
  }

  /**
   * Stores the account entity for easy access through `getAccount` and places
   * in the set of entities to synchronize.
   *
   * @param entity the entity of class `Account` to which other resources will
   * be related
   */
  public async putAccount(entity: EntityFromIntegration): Promise<number> {
    await this.resourceCache.putEntry({ key: "account", data: entity });
    return this.putEntities([entity]);
  }

  /**
   * Retrieves an entity created from provider data.
   *
   * @param key the entity _key value
   * @returns undefined when the provider does not have data representing the
   * key
   */
  public async getEntity(
    key: string,
  ): Promise<EntityFromIntegration | undefined> {
    const entry = await this.resourceCache
      .iterableCache("entities")
      .getEntry(key);
    return entry.data;
  }

  // TODO Upload RawData and ensure entities have temp uris for it?
  // The cached object will have _rawData too if we don't, though that may not
  // be a problem. Perhaps we can upload it later as normal?
  public putEntities(entities: EntityFromIntegration[]): Promise<number> {
    return this.resourceCache.iterableCache("entities").putEntries(
      entities.map(e => ({
        key: e._key,
        data: e,
      })),
    );
  }

  public iterateEntityKeys(
    cb: KeyIteratorCallback<EntityFromIntegration>,
  ): Promise<void> {
    return this.iterateKeys("entities", cb);
  }

  public iterateRelationshipKeys(
    cb: KeyIteratorCallback<IntegrationRelationship>,
  ): Promise<void> {
    return this.iterateKeys("relationships", cb);
  }

  public putRelationships(
    relationships: IntegrationRelationship[],
  ): Promise<number> {
    return this.resourceCache.iterableCache("relationships").putEntries(
      relationships.map(e => ({
        key: e._key,
        data: e,
      })),
    );
  }

  /**
   * Retrieves a relationship created from provider data.
   *
   * @param key the relationship _key value
   * @returns undefined when the provider does not have data representing the
   * key
   */
  public async getRelationship(
    key: string,
  ): Promise<IntegrationRelationship | undefined> {
    const entry = await this.resourceCache
      .iterableCache("relationships")
      .getEntry(key);
    return entry.data;
  }

  private iterateKeys<EntryType>(
    resourceType: "entities" | "relationships",
    cb: KeyIteratorCallback<EntryType>,
  ): Promise<void> {
    return this.resourceCache
      .iterableCache(resourceType)
      .forEachKey(async (key, index, qty, getEntry) => {
        await cb(key, index, qty, async () => {
          const resource = (await getEntry()).data;
          if (!resource) {
            throw new IntegrationError(
              "Cache has a key listed for which there is no entry in the cache!",
            );
          }
          return resource;
        });
      });
  }
}

export const invocationConfig: IntegrationInvocationConfig = {
  instanceConfigFields: {
    clientId: {
      type: "string",
      mask: false,
    },
    clientSecret: {
      type: "string",
      mask: true,
    },
  },

  invocationValidator,

  integrationStepPhases: [
    {
      steps: [
        {
          id: "fetch-account",
          name: "Fetch Account",
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ): Promise<IntegrationStepExecutionResult> => {
            const cache = new ProviderGraphObjectCache(
              executionContext.clients.getCache(),
            );
            await cache.putAccount(
              createAccountEntity(executionContext.instance),
            );
            return {};
          },
        },
      ],
    },
    {
      steps: [
        {
          id: "fetch-devices",
          name: "Fetch Devices",
          iterates: true,
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ): Promise<IntegrationStepIterationState> => {
            const cache = new ProviderGraphObjectCache(
              executionContext.clients.getCache(),
            );
            const accountEntity = await cache.getAccount();

            const falconAPI = new FalconAPIClient(
              executionContext.instance.config,
            );

            const iterationState = getIterationState(executionContext);

            const newState = await falconAPI.iterateDevices({
              cb: async devices => {
                const sensorEntities: EntityFromIntegration[] = [];
                const accountSensorRelationships: IntegrationRelationship[] = [];
                for (const device of devices) {
                  const entity = createDeviceHostAgentEntity(device);
                  sensorEntities.push(entity);
                  accountSensorRelationships.push(
                    createIntegrationRelationship("HAS", accountEntity, entity),
                  );
                }
                await Promise.all([
                  cache.putEntities(sensorEntities),
                  cache.putRelationships(accountSensorRelationships),
                ]);
              },
              pagination: iterationState.state,
              filter:
                iterationState.iteration === 0
                  ? `last_seen:>='${lastSeenSince()}'`
                  : undefined,
            });

            return {
              ...iterationState,
              finished: newState.finished,
              state: newState,
            };
          },
        },
      ],
    },

    {
      steps: [
        {
          id: "synchronize",
          name: "Synchronize",
          executionHandler: async (
            executionContext: IntegrationStepExecutionContext,
          ): Promise<IntegrationStepExecutionResult> => {
            const { graph, persister } = executionContext.clients.getClients();
            const cache = new ProviderGraphObjectCache(
              executionContext.clients.getCache(),
            );

            // TODO since this is a rolling view, do not delete things that are no longer seen

            const synchronizeEntities = async (): Promise<PersisterOperationsResult> => {
              const [
                oldAccountEntities,
                oldDeviceEntities,
              ] = await Promise.all([
                graph.findEntitiesByType(ACCOUNT_ENTITY_TYPE),
                graph.findEntitiesByType(DEVICE_ENTITY_TYPE),
              ]);

              const entityOperations: EntityOperation[] = [];

              const oldEntities = [...oldAccountEntities, ...oldDeviceEntities];

              const processedEntityKeys: string[] = [];

              for (const oldEntity of oldEntities) {
                const providerEntity = await cache.getEntity(oldEntity._key);
                if (providerEntity) {
                  entityOperations.push(
                    ...persister.processEntities([oldEntity], [providerEntity]),
                  );
                } else {
                  entityOperations.push(
                    ...persister.processEntities([oldEntity], []),
                  );
                }
                processedEntityKeys.push(oldEntity._key);
              }

              await cache.iterateEntityKeys(
                async (newEntityKey, _index, _qty, getResource) => {
                  if (!processedEntityKeys.includes(newEntityKey)) {
                    const newEntity = await getResource();
                    const operations = persister.processEntities(
                      [],
                      [newEntity],
                    );
                    entityOperations.push(...operations);
                  }
                },
              );

              return persister.publishEntityOperations(entityOperations);
            };

            const synchronizeRelationships = async (): Promise<PersisterOperationsResult> => {
              const relationshipOperations: RelationshipOperation[] = [];

              const oldRelationships = await graph.findRelationshipsByType(
                generateRelationshipType(
                  "HAS",
                  ACCOUNT_ENTITY_TYPE,
                  DEVICE_ENTITY_TYPE,
                ),
              );

              const processedRelationshipKeys: string[] = [];

              for (const oldRelationship of oldRelationships) {
                const providerRelationship = await cache.getRelationship(
                  oldRelationship._key,
                );
                if (providerRelationship) {
                  relationshipOperations.push(
                    ...persister.processRelationships(
                      [oldRelationship],
                      [providerRelationship],
                    ),
                  );
                } else {
                  relationshipOperations.push(
                    ...persister.processRelationships([oldRelationship], []),
                  );
                }
                processedRelationshipKeys.push(oldRelationship._key);
              }

              await cache.iterateRelationshipKeys(
                async (key, _index, _qty, getResource) => {
                  if (!processedRelationshipKeys.includes(key)) {
                    const resource = await getResource();
                    relationshipOperations.push(
                      ...persister.processRelationships([], [resource]),
                    );
                  }
                },
              );

              return persister.publishRelationshipOperations(
                relationshipOperations,
              );
            };

            const entitiesResults = await synchronizeEntities();
            const relationshipsResults = await synchronizeRelationships();

            return {
              operations: summarizePersisterOperationsResults(
                entitiesResults,
                relationshipsResults,
              ),
            };
          },
        },
      ],
    },
  ],
};

function getIterationState(
  executionContext: IntegrationStepExecutionContext,
): IntegrationStepIterationState {
  const iterationState = executionContext.event.iterationState;
  if (!iterationState) {
    throw new IntegrationError("Expected iterationState not found in event!");
  }
  return iterationState;
}

const THIRTY_DAYS_AGO = 60 * 1000 * 60 * 24 * 30;
const LAST_SEEN_DAYS_BACK = THIRTY_DAYS_AGO;

function lastSeenSince(): string {
  return new Date(Date.now() - LAST_SEEN_DAYS_BACK).toISOString();
}
