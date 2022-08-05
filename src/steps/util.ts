import {
  Entity,
  IntegrationError,
  JobState,
} from '@jupiterone/integration-sdk-core';
import { Entities, SetDataKeys } from './constants';

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

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export function getDateInPast(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * DAY_IN_MS);
}

export function createFQLTimestamp(date: Date) {
  return date.toISOString();
}
