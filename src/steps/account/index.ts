import {
  createDirectRelationship,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import { Entities, Relationships, SetDataKeys, StepIds } from '../constants';
import {
  createAccountEntity,
  createProtectionServiceEntity,
} from '../../jupiterone/converters';
import { IntegrationConfig } from '../../config';

async function getAccount(
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
