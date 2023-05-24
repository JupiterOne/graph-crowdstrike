import { accountSteps } from './account';
import { devicePolicySteps } from './devicePolicies';
import { devicesSteps } from './devices';
import { preventionPoliciesSteps } from './preventionPolicies';
import { vulnerabilitiesSteps } from './vulnerabilities';
import { ZTASteps } from './zero-trust-assessment';

export const integrationSteps = [
  ...accountSteps,
  ...devicesSteps,
  ...devicePolicySteps,
  ...preventionPoliciesSteps,
  ...vulnerabilitiesSteps,
  ...ZTASteps,
];
