import {
  createIntegrationRelationship,
  EntityFromIntegration,
  IntegrationRelationship,
  IntegrationStepExecutionContext,
  IntegrationStepIterationState,
} from "@jupiterone/jupiter-managed-integration-sdk";

import { FalconAPIClient } from "../crowdstrike";
import getIterationState from "../getIterationState";
import {
  createDeviceHostAgentEntity,
  DEVICE_ENTITY_TYPE,
  ACCOUNT_DEVICE_RELATIONSHIP_TYPE,
} from "../jupiterone/converters";
import ProviderGraphObjectCache from "../ProviderGraphObjectCache";

export default {
  id: "fetch-devices",
  name: "Fetch Devices",
  iterates: true,
  executionHandler: async (
    executionContext: IntegrationStepExecutionContext,
  ): Promise<IntegrationStepIterationState> => {
    const { logger } = executionContext;

    const cache = executionContext.clients.getCache();
    const objectCache = new ProviderGraphObjectCache(cache);

    const accountEntity = await objectCache.getAccount();
    const deviceIds = (await cache.getEntry("device-ids")).data || [];

    const falconAPI = new FalconAPIClient(executionContext.instance.config);

    const iterationState = getIterationState(executionContext);

    logger.info({ iterationState }, "Iterating devices...");

    const filter =
      iterationState.iteration === 0
        ? `last_seen:>='${lastSeenSince()}'`
        : undefined;

    const pagination = await falconAPI.iterateDevices({
      callback: async devices => {
        logger.info(
          { deviceCount: devices.length },
          "Creating device entities and relationships...",
        );

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
          objectCache.putEntities(sensorEntities),
          objectCache.putRelationships(accountSensorRelationships),
        ]);
      },
      pagination: iterationState.state.pagination,
      query: {
        filter,
      },
    });

    await cache.putEntry({ key: "device-ids", data: deviceIds });

    await objectCache.putCollectionStates(
      { type: DEVICE_ENTITY_TYPE, success: pagination.finished },
      { type: ACCOUNT_DEVICE_RELATIONSHIP_TYPE, success: pagination.finished },
    );

    return {
      ...iterationState,
      finished: pagination.finished,
      state: {
        pagination,
      },
    };
  },
};

const THIRTY_DAYS_AGO = 60 * 1000 * 60 * 24 * 30;
const LAST_SEEN_DAYS_BACK = THIRTY_DAYS_AGO;

function lastSeenSince(): string {
  return new Date(Date.now() - LAST_SEEN_DAYS_BACK).toISOString();
}
