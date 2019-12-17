import {
  createIntegrationRelationship,
  EntityFromIntegration,
  IntegrationRelationship,
  IntegrationStepExecutionContext,
  IntegrationStepIterationState,
} from "@jupiterone/jupiter-managed-integration-sdk";

import { FalconAPIClient } from "../crowdstrike";
import getIterationState from "../getIterationState";
import { createDeviceHostAgentEntity } from "../jupiterone/converters";
import ProviderGraphObjectCache from "../ProviderGraphObjectCache";
import { PaginationState } from "../crowdstrike/types";

export default {
  id: "fetch-devices",
  name: "Fetch Devices",
  iterates: true,
  executionHandler: async (
    executionContext: IntegrationStepExecutionContext,
  ): Promise<IntegrationStepIterationState> => {
    const { logger } = executionContext;

    const cache = new ProviderGraphObjectCache(
      executionContext.clients.getCache(),
    );

    const accountEntity = await cache.getAccount();

    const falconAPI = new FalconAPIClient(executionContext.instance.config);

    const iterationState = getIterationState(executionContext);

    logger.info({ iterationState }, "Iterating devices...");

    const filter =
      iterationState.iteration === 0
        ? `last_seen:>='${lastSeenSince()}'`
        : undefined;

    let pagination: PaginationState | undefined =
      iterationState.state.pagination;

    pagination = await falconAPI.iterateDevices({
      cb: async devices => {
        logger.info(
          { pagination },
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
          cache.putEntities(sensorEntities),
          cache.putRelationships(accountSensorRelationships),
        ]);
      },
      pagination: iterationState.state.pagination,
      query: {
        filter,
      },
    });

    return {
      ...iterationState,
      finished: pagination.finished,
      state: {
        pagination,
        filter,
      },
    };
  },
};

const THIRTY_DAYS_AGO = 60 * 1000 * 60 * 24 * 30;
const LAST_SEEN_DAYS_BACK = THIRTY_DAYS_AGO;

function lastSeenSince(): string {
  return new Date(Date.now() - LAST_SEEN_DAYS_BACK).toISOString();
}
