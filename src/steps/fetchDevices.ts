import {
  createIntegrationRelationship,
  EntityFromIntegration,
  IntegrationRelationship,
  IntegrationStepExecutionContext,
  IntegrationStepIterationState,
} from "@jupiterone/jupiter-managed-integration-sdk";

import createFalconAPIClient from "../crowdstrike/createFalconAPIClient";
import getIterationState from "../getIterationState";
import {
  ACCOUNT_SENSOR_AGENT_RELATIONSHIP_TYPE,
  createSensorAgentDeviceMappedRelationship,
  createSensorAgentEntity,
  SENSOR_AGENT_DEVICE_MAPPED_RELATIONSHIP_TYPE,
  SENSOR_AGENT_ENTITY_TYPE,
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

    const falconAPI = createFalconAPIClient(executionContext);

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
        const sensorRelationships: IntegrationRelationship[] = [];
        for (const device of devices) {
          const entity = createSensorAgentEntity(device);
          sensorEntities.push(entity);
          sensorRelationships.push(
            createIntegrationRelationship({
              _class: "HAS",
              from: accountEntity,
              to: entity,
            }),
          );
          sensorRelationships.push(
            createSensorAgentDeviceMappedRelationship(device, entity),
          );
        }
        await Promise.all([
          objectCache.putEntities(sensorEntities),
          objectCache.putRelationships(sensorRelationships),
        ]);
      },
      pagination: iterationState.state.pagination,
      query: {
        filter,
      },
    });

    await cache.putEntry({ key: "device-ids", data: deviceIds });

    await objectCache.putCollectionStates(
      { type: SENSOR_AGENT_ENTITY_TYPE, success: pagination.finished },
      {
        type: ACCOUNT_SENSOR_AGENT_RELATIONSHIP_TYPE,
        success: pagination.finished,
      },
      {
        type: SENSOR_AGENT_DEVICE_MAPPED_RELATIONSHIP_TYPE,
        success: pagination.finished,
      },
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
