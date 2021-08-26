import {
  createDirectRelationship,
  IntegrationStepExecutionContext,
  RelationshipClass,
  Step,
} from "@jupiterone/integration-sdk-core";
import { Entities, Relationships, StepIds } from "../constants";
import createFalconAPIClient from "../crowdstrike/createFalconAPIClient";
import { createSensorAgentEntity } from "../jupiterone/converters";
import { CrowdStrikeIntegrationInstanceConfig } from "../types";
import { getAccountEntityFromJobState } from "./getAccount";

export async function fetchDevices(
  context: IntegrationStepExecutionContext<
    CrowdStrikeIntegrationInstanceConfig
  >,
): Promise<void> {
  const { instance, jobState, logger } = context;

  const accountEntity = await getAccountEntityFromJobState(jobState);
  const client = createFalconAPIClient(instance.config, logger);

  logger.info("Iterating devices...");
  await client.iterateDevices({
    // TODO remove `pagination` arg
    pagination: undefined,
    query: {
      filter: `last_seen:>='${lastSeenSince()}'`,
    },
    callback: async devices => {
      logger.info(
        { deviceCount: devices.length },
        "Creating device entities and relationships...",
      );

      for (const device of devices) {
        const deviceEntity = await jobState.addEntity(
          createSensorAgentEntity(device),
        );
        await jobState.addRelationship(
          createDirectRelationship({
            from: accountEntity,
            _class: RelationshipClass.HAS,
            to: deviceEntity,
          }),
        );
      }
    },
  });
}

const THIRTY_DAYS_AGO = 60 * 1000 * 60 * 24 * 30;
const LAST_SEEN_DAYS_BACK = THIRTY_DAYS_AGO;

function lastSeenSince(): string {
  return new Date(Date.now() - LAST_SEEN_DAYS_BACK).toISOString();
}

export const fetchDevicesStep: Step<IntegrationStepExecutionContext<
  CrowdStrikeIntegrationInstanceConfig
>> = {
  id: StepIds.DEVICES,
  name: "Fetch Devices",
  entities: [Entities.SENSOR],
  relationships: [Relationships.ACCOUNT_HAS_SENSOR],
  dependsOn: [StepIds.ACCOUNT],
  executionHandler: fetchDevices,
};
