import {
  IntegrationStepExecutionContext,
  IntegrationStepIterationState,
  RelationshipFromIntegration,
} from "@jupiterone/jupiter-managed-integration-sdk";

import { FalconAPIClient } from "../crowdstrike";
import {
  NumericOffsetPaginationParams,
  NumericOffsetPaginationState,
} from "../crowdstrike/types";
import getIterationState from "../getIterationState";
import { SENSOR_AGENT_PREVENTION_POLICY_RELATIONSHIP_TYPE } from "../jupiterone/converters";
import ProviderGraphObjectCache from "../ProviderGraphObjectCache";

const MEMBERS_PAGINATION: NumericOffsetPaginationParams = {
  limit: 1,
};

export default {
  id: "fetch-device-policies",
  name: "Fetch Device Policies",
  iterates: true,
  executionHandler: async (
    executionContext: IntegrationStepExecutionContext,
  ): Promise<IntegrationStepIterationState> => {
    const { logger } = executionContext;

    const cache = executionContext.clients.getCache();
    const objectCache = new ProviderGraphObjectCache(cache);
    const falconAPI = new FalconAPIClient(executionContext.instance.config);

    const iterationState = getIterationState(executionContext);

    logger.info({ iterationState }, "Iterating policy members...");

    const deviceIds = new Set<string>(
      (await cache.getEntry("device-ids")).data || [],
    );
    const policyIds: string[] =
      (await cache.getEntry("prevention-policy-ids")).data || [];

    let policyPagination: NumericOffsetPaginationState = iterationState.state
      .policyPagination || {
      limit: 1,
      offset: 0,
      total: policyIds.length,
      finished: false,
      seen: 0,
      pages: 1,
    };

    let policyIndex = policyPagination.offset || 0;

    let membersPagination: NumericOffsetPaginationParams = iterationState.state
      .membersPagination || { ...MEMBERS_PAGINATION };

    do {
      const policyId = policyIds[policyIndex];
      const loggerInfo = { policyPagination, membersPagination };

      membersPagination = await falconAPI.iteratePreventionPolicyMemberIds({
        callback: async memberIds => {
          logger.trace(loggerInfo, "Processing page of member ids");

          const relationships: RelationshipFromIntegration[] = [];

          for (const deviceId of memberIds) {
            if (deviceIds.has(deviceId)) {
              relationships.push({
                _key: `${deviceId}|assigned|${policyId}`,
                _type: SENSOR_AGENT_PREVENTION_POLICY_RELATIONSHIP_TYPE,
                _class: "ASSIGNED",
                _fromEntityKey: deviceId,
                _toEntityKey: policyId,
                displayName: "ASSIGNED",
              });
            }
          }
          await objectCache.putRelationships(relationships);
        },
        pagination: membersPagination,
        policyId,
      });

      if (membersPagination.finished) {
        membersPagination = MEMBERS_PAGINATION;

        policyPagination = {
          ...policyPagination,
          offset: policyIndex,
          seen: policyPagination.seen + 1,
          finished: policyIndex === policyIds.length - 1,
        };

        logger.info(
          { policyPagination, membersPagination },
          "Finished paging policy members",
        );

        policyIndex += 1;
      }
    } while (!policyPagination.finished);

    await objectCache.putCollectionStates({
      type: SENSOR_AGENT_PREVENTION_POLICY_RELATIONSHIP_TYPE,
      success: policyPagination.finished && !!membersPagination.finished,
    });

    return {
      ...iterationState,
      finished: policyPagination.finished,
      state: {
        policyPagination,
        membersPagination: policyPagination.finished
          ? undefined
          : membersPagination,
      },
    };
  },
};
