import {
  EntityFromIntegration,
  IntegrationCache,
  IntegrationError,
  IntegrationRelationship,
} from "@jupiterone/jupiter-managed-integration-sdk";

interface KeyIteratorCallback<EntryType> {
  (each: {
    key: string;
    keyIndex: number;
    totalKeys: number;
    getResource: () => Promise<EntryType>;
  }): Promise<void>;
}

/**
 * The state of collecting a set of resources from the data provider. Complete
 * synchronization relies on seeing indication of success for each type of
 * resource.
 */
type ProviderResourceCollectionState = {
  /**
   * The `_type` of the resources assigned through conversion of provider data
   * to graph objects.
   */
  type: string;

  /**
   * Indicates fetching the collection from the provider completed successfully.
   */
  success: boolean;
};

type ProviderResourceCollectionStateTypeMap = {
  [type: string]: ProviderResourceCollectionState;
};

const COLLECTION_STATES_MAP_ENTRY_KEY = "collection-states-map";

/**
 * A cache of provider data, already converted to `EntityFromIntegration` and
 * `IntegrationRelationship` objects.
 */
export default class ProviderGraphObjectCache {
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
  public async getEntityByKey(
    key: string,
  ): Promise<EntityFromIntegration | undefined> {
    const entry = await this.resourceCache
      .iterableCache("entities")
      .getEntry(key);
    return entry.data;
  }

  public putEntities(entities: EntityFromIntegration[]): Promise<number> {
    return this.resourceCache.iterableCache("entities").putEntries(
      entities.map(e => ({
        key: e._key,
        data: e,
      })),
    );
  }

  public async getCollectionStatesMap(): Promise<
    ProviderResourceCollectionStateTypeMap
  > {
    return (
      (await this.resourceCache.getEntry(COLLECTION_STATES_MAP_ENTRY_KEY))
        .data || {}
    );
  }

  public async putCollectionStates(
    ...states: ProviderResourceCollectionState[]
  ): Promise<void> {
    const statesMap = await this.getCollectionStatesMap();
    for (const state of states) {
      statesMap[state.type] = state;
    }
    return this.resourceCache.putEntry({
      key: COLLECTION_STATES_MAP_ENTRY_KEY,
      data: statesMap,
    });
  }

  public iterateEntityKeys(
    callback: KeyIteratorCallback<EntityFromIntegration>,
  ): Promise<void> {
    return this.iterateKeys("entities", callback);
  }

  public iterateRelationshipKeys(
    callback: KeyIteratorCallback<IntegrationRelationship>,
  ): Promise<void> {
    return this.iterateKeys("relationships", callback);
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
  public async getRelationshipByKey(
    key: string,
  ): Promise<IntegrationRelationship | undefined> {
    const entry = await this.resourceCache
      .iterableCache("relationships")
      .getEntry(key);
    return entry.data;
  }

  private iterateKeys<EntryType>(
    resourceType: "entities" | "relationships",
    callback: KeyIteratorCallback<EntryType>,
  ): Promise<void> {
    return this.resourceCache
      .iterableCache(resourceType)
      .forEachKey(async e => {
        await callback({
          ...e,
          getResource: async () => {
            const resource = (await e.getEntry()).data;
            if (!resource) {
              throw new IntegrationError(
                "Cache has a key listed for which there is no entry in the cache!",
              );
            }
            return resource;
          },
        });
      });
  }
}
