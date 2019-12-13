import {
  EntityOperation,
  generateRelationshipType,
  IntegrationStepExecutionContext,
  IntegrationStepExecutionResult,
  PersisterOperationsResult,
  RelationshipOperation,
  summarizePersisterOperationsResults,
} from "@jupiterone/jupiter-managed-integration-sdk";

import {
  ACCOUNT_ENTITY_TYPE,
  DEVICE_ENTITY_TYPE,
} from "../jupiterone/converters";
import ProviderGraphObjectCache from "../ProviderGraphObjectCache";

export default {
  id: "synchronize",
  name: "Synchronize",
  executionHandler: async (
    executionContext: IntegrationStepExecutionContext,
  ): Promise<IntegrationStepExecutionResult> => {
    const { graph, persister } = executionContext.clients.getClients();
    const providerCache = new ProviderGraphObjectCache(
      executionContext.clients.getCache(),
    );

    const synchronizeEntities = async (): Promise<PersisterOperationsResult> => {
      const [oldAccountEntities, oldDeviceEntities] = await Promise.all([
        graph.findEntitiesByType(ACCOUNT_ENTITY_TYPE),
        graph.findEntitiesByType(DEVICE_ENTITY_TYPE),
      ]);

      const entityOperations: EntityOperation[] = [];

      const oldEntities = [...oldAccountEntities, ...oldDeviceEntities];

      const processedEntityKeys: string[] = [];

      for (const oldEntity of oldEntities) {
        const providerEntity = await providerCache.getEntity(oldEntity._key);
        if (providerEntity) {
          // Update graph object with latest provider data
          entityOperations.push(
            ...persister.processEntities([oldEntity], [providerEntity]),
          );
        } else {
          // Delete graph object not found in the provider data set
          entityOperations.push(...persister.processEntities([oldEntity], []));
        }
        processedEntityKeys.push(oldEntity._key);
      }

      // Identify new provider data to create objects in the graph
      await providerCache.iterateEntityKeys(
        async (newEntityKey, _index, _qty, getResource) => {
          if (!processedEntityKeys.includes(newEntityKey)) {
            const newEntity = await getResource();
            const operations = persister.processEntities([], [newEntity]);
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
        const providerRelationship = await providerCache.getRelationship(
          oldRelationship._key,
        );
        if (providerRelationship) {
          // Update graph object with latest provider data
          relationshipOperations.push(
            ...persister.processRelationships(
              [oldRelationship],
              [providerRelationship],
            ),
          );
        } else {
          // Delete graph object not found in the provider data set
          relationshipOperations.push(
            ...persister.processRelationships([oldRelationship], []),
          );
        }
        processedRelationshipKeys.push(oldRelationship._key);
      }

      // Identify new provider data to create objects in the graph
      await providerCache.iterateRelationshipKeys(
        async (key, _index, _qty, getResource) => {
          if (!processedRelationshipKeys.includes(key)) {
            const resource = await getResource();
            relationshipOperations.push(
              ...persister.processRelationships([], [resource]),
            );
          }
        },
      );

      return persister.publishRelationshipOperations(relationshipOperations);
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
};
