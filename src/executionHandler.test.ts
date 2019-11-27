import { IntegrationExecutionContext } from "@jupiterone/jupiter-managed-integration-sdk";
import executionHandler from "./executionHandler";
import initializeContext from "./initializeContext";
import {
  DEVICE_ENTITY_TYPE,
  USER_DEVICE_RELATIONSHIP_TYPE,
  USER_ENTITY_TYPE,
} from "./types";

jest.mock("./initializeContext");

test("executionHandler", async () => {
  const executionContext = {
    graph: {
      findEntitiesByType: jest.fn().mockResolvedValue([]),
      findRelationshipsByType: jest.fn().mockResolvedValue([]),
    },
    persister: {
      processEntities: jest.fn().mockReturnValue([]),
      processRelationships: jest.fn().mockReturnValue([]),
      publishPersisterOperations: jest.fn().mockResolvedValue({}),
    },
    provider: {
      fetchAccountDetails: jest.fn().mockReturnValue({}),
      fetchDevices: jest.fn().mockReturnValue([]),
      fetchUsers: jest.fn().mockReturnValue([]),
    },
  };

  (initializeContext as jest.Mock).mockReturnValue(executionContext);

  const invocationContext = {} as IntegrationExecutionContext;
  await executionHandler(invocationContext);

  expect(initializeContext).toHaveBeenCalledWith(invocationContext);

  expect(executionContext.graph.findEntitiesByType).toHaveBeenCalledWith(
    USER_ENTITY_TYPE,
  );
  expect(executionContext.graph.findEntitiesByType).toHaveBeenCalledWith(
    DEVICE_ENTITY_TYPE,
  );
  expect(executionContext.graph.findRelationshipsByType).toHaveBeenCalledWith(
    USER_DEVICE_RELATIONSHIP_TYPE,
  );

  expect(executionContext.provider.fetchAccountDetails).toHaveBeenCalledTimes(
    1,
  );
  expect(executionContext.provider.fetchUsers).toHaveBeenCalledTimes(1);
  expect(executionContext.provider.fetchDevices).toHaveBeenCalledTimes(1);

  expect(executionContext.persister.processEntities).toHaveBeenCalledTimes(3);
  expect(executionContext.persister.processRelationships).toHaveBeenCalledTimes(
    2,
  );
  expect(
    executionContext.persister.publishPersisterOperations,
  ).toHaveBeenCalledTimes(1);
});
