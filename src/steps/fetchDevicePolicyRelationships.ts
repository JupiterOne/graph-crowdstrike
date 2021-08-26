import {
  getRawData,
  IntegrationStepExecutionContext,
  RelationshipClass,
  Step,
} from "@jupiterone/integration-sdk-core";
import { Entities, Relationships, StepIds } from "../constants";
import createFalconAPIClient from "../crowdstrike/createFalconAPIClient";
import { PreventionPolicy } from "../crowdstrike/types";
import { CrowdStrikeIntegrationInstanceConfig } from "../types";

export async function fetchDevicePolicyRelationships(
  context: IntegrationStepExecutionContext<
    CrowdStrikeIntegrationInstanceConfig
  >,
): Promise<void> {
  const { instance, jobState, logger } = context;
  const client = createFalconAPIClient(instance.config, logger);

  logger.info("Iterating policy members...");
  await jobState.iterateEntities(
    { _type: Entities.PREVENTION_POLICY._type },
    async preventionPolicyEntity => {
      const preventionPolicy = getRawData<PreventionPolicy>(
        preventionPolicyEntity,
      );
      if (!preventionPolicy) {
        logger.warn(
          {
            _key: preventionPolicyEntity._key,
          },
          "Could not get prevention policy raw data from entity.",
        );
        return;
      }

      const policyId = preventionPolicy.id;

      await client.iteratePreventionPolicyMemberIds({
        // TODO remove `pagination` arg
        pagination: undefined,
        policyId: policyId,
        callback: async memberIds => {
          logger.info(
            {
              memberCount: memberIds.length,
              policyId,
            },
            "Processing page of member ids",
          );

          for (const deviceId of memberIds) {
            await jobState.addRelationship({
              _key: `${deviceId}|assigned|${policyId}`,
              _type: Relationships.SENSOR_ASSIGNED_PREVENTION_POLICY._type,
              _class: RelationshipClass.ASSIGNED,
              _fromEntityKey: deviceId,
              _toEntityKey: policyId,
              displayName: "ASSIGNED",
            });
          }
        },
      });
    },
  );
}

export const fetchDevicePolicyRelationshipsStep: Step<IntegrationStepExecutionContext<
  CrowdStrikeIntegrationInstanceConfig
>> = {
  id: StepIds.DEVICE_POLICY_RELATIONSHIPS,
  name: "Fetch Device Policies",
  entities: [],
  relationships: [Relationships.SENSOR_ASSIGNED_PREVENTION_POLICY],
  dependsOn: [StepIds.DEVICES, StepIds.PREVENTION_POLICIES],
  executionHandler: fetchDevicePolicyRelationships,
};