import {
  IntegrationError,
  IntegrationStepExecutionContext,
  IntegrationStepIterationState,
} from "@jupiterone/jupiter-managed-integration-sdk";

export default function getIterationState(
  executionContext: IntegrationStepExecutionContext,
): IntegrationStepIterationState {
  const iterationState = executionContext.event.iterationState;
  if (!iterationState) {
    throw new IntegrationError("Expected iterationState not found in event!");
  }
  return iterationState;
}
