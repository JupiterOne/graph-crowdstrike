import {
  createDirectRelationship,
  Entity,
  IntegrationError,
  IntegrationStep,
  IntegrationStepExecutionContext,
  JobState,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import { Entities, Relationships, SetDataKeys, StepIds } from '../constants';
import {
  createAccountEntity,
  createProtectionServiceEntity,
} from '../../jupiterone/converters';
import { IntegrationConfig } from '../../config';

export async function getAccountEntityFromJobState(
  jobState: JobState,
): Promise<Entity> {
  const accountEntity = await jobState.getData<Entity>(
    SetDataKeys.ACCOUNT_ENTITY,
  );

  if (!accountEntity) {
    throw new IntegrationError({
      code: 'MISSING_ACCOUNT_ENTITY',
      message: `The ${Entities.ACCOUNT._type} entity could not be found in the job state.`,
    });
  }
  return accountEntity;
}

export async function getProtectionServiceEntityFromJobState(
  jobState: JobState,
): Promise<Entity> {
  const protectionServiceEntity = await jobState.getData<Entity>(
    SetDataKeys.PROTECTION_SERVICE_ENTITY,
  );

  if (!protectionServiceEntity) {
    throw new IntegrationError({
      code: 'MISSING_PROTECTION_SERVICE_ENTITY',
      message: `The ${Entities.PROTECTION_SERVICE._type} entity could not be found in the job state.`,
    });
  }
  return protectionServiceEntity;
}

export async function getAccount(
  context: IntegrationStepExecutionContext<IntegrationConfig>,
): Promise<void> {
  const { instance, jobState } = context;
  const accountEntity = await jobState.addEntity(createAccountEntity(instance));
  await jobState.setData(SetDataKeys.ACCOUNT_ENTITY, accountEntity);

  const protectionServiceEntity = await jobState.addEntity(
    createProtectionServiceEntity(instance),
  );
  await jobState.setData(
    SetDataKeys.PROTECTION_SERVICE_ENTITY,
    protectionServiceEntity,
  );

  await jobState.addRelationship(
    createDirectRelationship({
      from: accountEntity,
      _class: RelationshipClass.HAS,
      to: protectionServiceEntity,
    }),
  );
}

export const accountSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: StepIds.ACCOUNT,
    name: 'Get Account',
    entities: [Entities.ACCOUNT, Entities.PROTECTION_SERVICE],
    relationships: [Relationships.ACCOUNT_HAS_PROTECTION_SERVICE],
    executionHandler: getAccount,
  },
];
