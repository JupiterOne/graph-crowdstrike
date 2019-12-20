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
  DEVICE_PREVENTION_POLICY_RELATIONSHIP_TYPE,
  PREVENTION_POLICY_ENFORCES_PROTECTION_RELATIONSHIP_TYPE,
  PREVENTION_POLICY_ENTITY_TYPE,
  PROTECTION_SERVICE_ENTITY_TYPE,
} from "../jupiterone/converters";
import ProviderGraphObjectCache from "../ProviderGraphObjectCache";

export default {
  id: "synchronize",
  name: "Synchronize",
  executionHandler: async (
    executionContext: IntegrationStepExecutionContext,
  ): Promise<IntegrationStepExecutionResult> => {
    const { logger } = executionContext;
    const { graph, persister } = executionContext.clients.getClients();

    const providerCache = new ProviderGraphObjectCache(
      executionContext.clients.getCache(),
    );

    const collectionStates = await providerCache.getCollectionStatesMap();

    const synchronizeEntities = async (): Promise<PersisterOperationsResult> => {
      logger.info("Fetching old entities...");

      const [
        oldAccountEntities,
        oldServiceEntities,
        oldDeviceEntities,
        oldPolicyEntities,
      ] = await Promise.all([
        graph.findEntitiesByType(ACCOUNT_ENTITY_TYPE),
        graph.findEntitiesByType(PROTECTION_SERVICE_ENTITY_TYPE),
        graph.findEntitiesByType(DEVICE_ENTITY_TYPE),
        graph.findEntitiesByType(PREVENTION_POLICY_ENTITY_TYPE),
      ]);

      const entityOperations: EntityOperation[] = [];

      const oldEntities = [
        ...oldAccountEntities,
        ...oldServiceEntities,
        ...oldDeviceEntities,
        ...oldPolicyEntities,
      ];

      const processedEntityKeys = new Set<string>();

      logger.info(
        { entityCount: oldEntities.length },
        "Iterating old entities to produce update and delete operations...",
      );

      for (const oldEntity of oldEntities) {
        const providerEntity = await providerCache.getEntityByKey(
          oldEntity._key,
        );
        if (providerEntity) {
          // Update graph object with latest provider data
          entityOperations.push(
            ...persister.processEntities([oldEntity], [providerEntity]),
          );
        } else {
          // Delete graph object not found in the provider, if the set was fully collected
          if (collectionStates[oldEntity._type]?.success) {
            entityOperations.push(
              ...persister.processEntities([oldEntity], []),
            );
          } else {
            logger.warn(
              { _type: oldEntity._type, _key: oldEntity._key },
              "Data from provider is incomplete, deletion will not be performed",
            );
          }
        }
        processedEntityKeys.add(oldEntity._key);
      }

      logger.info("Iterating new entities to produce create operations...");

      await providerCache.iterateEntityKeys(async each => {
        if (!processedEntityKeys.has(each.key)) {
          const newEntity = await each.getResource();
          const operations = persister.processEntities([], [newEntity]);
          entityOperations.push(...operations);
        }
      });

      return persister.publishEntityOperations(entityOperations);
    };

    const synchronizeRelationships = async (): Promise<PersisterOperationsResult> => {
      logger.info("Fetching old relationships...");

      const [
        oldAccountDeviceRelationships,
        oldAccountServiceRelationships,
        oldPolicyServiceRelationships,
        oldDevicePolicyRelationships,
      ] = await Promise.all([
        graph.findRelationshipsByType(
          generateRelationshipType(
            "HAS",
            ACCOUNT_ENTITY_TYPE,
            DEVICE_ENTITY_TYPE,
          ),
        ),
        graph.findRelationshipsByType(
          generateRelationshipType(
            "HAS",
            ACCOUNT_ENTITY_TYPE,
            PROTECTION_SERVICE_ENTITY_TYPE,
          ),
        ),
        graph.findRelationshipsByType(
          PREVENTION_POLICY_ENFORCES_PROTECTION_RELATIONSHIP_TYPE,
        ),
        graph.findRelationshipsByType(
          DEVICE_PREVENTION_POLICY_RELATIONSHIP_TYPE,
        ),
      ]);

      const oldRelationships = [
        ...oldAccountDeviceRelationships,
        ...oldAccountServiceRelationships,
        ...oldPolicyServiceRelationships,
        ...oldDevicePolicyRelationships,
      ];

      const relationshipOperations: RelationshipOperation[] = [];
      const processedRelationshipKeys = new Set<string>();

      logger.info(
        { relationshipCount: oldRelationships.length },
        "Iterating old relationships to produce update and delete operations...",
      );

      for (const oldRelationship of oldRelationships) {
        const providerRelationship = await providerCache.getRelationshipByKey(
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
          // Delete graph object not found in the provider, if the set was fully collected
          if (collectionStates[oldRelationship._type]?.success) {
            relationshipOperations.push(
              ...persister.processRelationships([oldRelationship], []),
            );
          } else {
            logger.warn(
              { _type: oldRelationship._type, _key: oldRelationship._key },
              "Data from provider is incomplete, deletion will not be performed",
            );
          }
        }
        processedRelationshipKeys.add(oldRelationship._key);
      }

      logger.info(
        "Iterating new relationships to produce create operations...",
      );

      await providerCache.iterateRelationshipKeys(async e => {
        if (!processedRelationshipKeys.has(e.key)) {
          const resource = await e.getResource();
          relationshipOperations.push(
            ...persister.processRelationships([], [resource]),
          );
        }
      });

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
