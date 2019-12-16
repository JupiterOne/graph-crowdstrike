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

export default {
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

    const falconAPI = new FalconAPIClient(executionContext.instance.config);

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
      pagination: {
        ...iterationState.state,
        filter:
          iterationState.state.filter || `last_seen:>='${lastSeenSince()}'`,
      },
    });

    return {
      ...iterationState,
      finished: newState.finished,
      state: newState,
    };
  },
};

const THIRTY_DAYS_AGO = 60 * 1000 * 60 * 24 * 30;
const LAST_SEEN_DAYS_BACK = THIRTY_DAYS_AGO;

function lastSeenSince(): string {
  return new Date(Date.now() - LAST_SEEN_DAYS_BACK).toISOString();
}
