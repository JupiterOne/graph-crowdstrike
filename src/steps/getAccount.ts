import {
  createDirectRelationship,
  Entity,
  IntegrationError,
  IntegrationStepExecutionContext,
  JobState,
  RelationshipClass,
  Step,
} from "@jupiterone/integration-sdk-core";
import { Entities, Relationships, SetDataKeys, StepIds } from "../constants";
import {
  createAccountEntity,
  createProtectionServiceEntity,
} from "../jupiterone/converters";
import { CrowdStrikeIntegrationInstanceConfig } from "../types";

export async function getAccountEntityFromJobState(
  jobState: JobState,
): Promise<Entity> {
  const accountEntity = await jobState.findEntity(SetDataKeys.ACCOUNT_ENTITY);

  if (!accountEntity) {
    throw new IntegrationError({
      code: "MISSING_ACCOUNT_ENTITY",
      message: `The ${Entities.ACCOUNT._type} entity could not be found in the job state.`,
    });
  }
  return accountEntity;
}

export async function getProtectionServiceEntityFromJobState(
  jobState: JobState,
): Promise<Entity> {
  const protectionServiceEntity = await jobState.findEntity(
    SetDataKeys.PROTECTION_SERVICE_ENTITY,
  );

  if (!protectionServiceEntity) {
    throw new IntegrationError({
      code: "MISSING_PROTECTION_SERVICE_ENTITY",
      message: `The ${Entities.PROTECTION_SERVICE._type} entity could not be found in the job state.`,
    });
  }
  return protectionServiceEntity;
}

export async function getAccount(
  context: IntegrationStepExecutionContext<
    CrowdStrikeIntegrationInstanceConfig
  >,
): Promise<void> {
  const { instance, jobState } = context;
  const accountEntity = await jobState.addEntity(createAccountEntity(instance));

  const protectionServiceEntity = await jobState.addEntity(
    createProtectionServiceEntity(instance),
  );

  await jobState.addRelationship(
    createDirectRelationship({
      from: accountEntity,
      _class: RelationshipClass.HAS,
      to: protectionServiceEntity,
    }),
  );
}

export const getAccountStep: Step<IntegrationStepExecutionContext<
  CrowdStrikeIntegrationInstanceConfig
>> = {
  id: StepIds.ACCOUNT,
  name: "Get Account",
  entities: [Entities.ACCOUNT, Entities.PROTECTION_SERVICE],
  relationships: [Relationships.ACCOUNT_HAS_PROTECTION_SERVICE],
  executionHandler: getAccount,
};
