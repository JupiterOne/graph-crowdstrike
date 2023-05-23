import {
  IntegrationProviderAuthorizationError,
  IntegrationStep,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';

import { DiscoverSteps } from '../constants';

import { IntegrationWarnEventName } from '@jupiterone/integration-sdk-core/dist/src/types/logger';
import getOrCreateFalconAPIClient from '../../../crowdstrike/getOrCreateFalconAPIClient';
import { IntegrationConfig } from '../../../config';

async function fetchApplications({
  instance,
  jobState,
  logger,
  executionHistory,
}: IntegrationStepExecutionContext<IntegrationConfig>): Promise<void> {
  const client = getOrCreateFalconAPIClient(instance.config, logger);

  await client
    .iterateApplications({
      query: {
        // TODO: find the liit
        limit: '100',
      },
      callback: async (apps) => {
        for (const app of apps) {
          console.log('EUGE2', app);
        }
      },
    })
    .catch((error) => {
      if (
        error instanceof IntegrationProviderAuthorizationError &&
        error.status === 403
      ) {
        logger.warn(
          { error },
          'Encountered a 403 while ingesting applications. This is most like a permissions error.',
        );
        logger.publishWarnEvent({
          name: IntegrationWarnEventName.MissingPermission,
          description:
            'Received authorization error when attempting to retrieve applications. Please update credentials to grant access.',
        });
      } else {
        throw error;
      }
    });
}

export const fetchApplicationsStepMap: IntegrationStep<IntegrationConfig> = {
  id: DiscoverSteps.FETCH_APPLICATIONS.id,
  name: DiscoverSteps.FETCH_APPLICATIONS.name,
  entities: [],
  relationships: [],
  dependsOn: [],
  executionHandler: fetchApplications,
};
