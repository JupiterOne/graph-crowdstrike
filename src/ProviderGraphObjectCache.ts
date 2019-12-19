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
  public async getEntity(
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
      .forEachKey(async e => {
        await cb({
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
