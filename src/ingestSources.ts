import { IntegrationIngestionConfigFieldMap } from '@jupiterone/integration-sdk-core';
import { IngestionSources } from './constants';

export const ingestionConfig: IntegrationIngestionConfigFieldMap = {
  [IngestionSources.DISCOVER_APPLICATIONS]: {
    title: 'Discover Applications',
    description: 'Identifies & manages software use.',
    defaultsToDisabled: false,
  },
  [IngestionSources.DEVICE_POLICIES]: {
    title: 'Device Policies',
    description: 'Rules governing device security.',
    defaultsToDisabled: false,
  },
  [IngestionSources.DEVICES]: {
    title: 'Devices',
    description: 'Endpoints monitored for threats.',
    defaultsToDisabled: false,
  },
  [IngestionSources.PREVENTION_POLICIES]: {
    title: 'Prevention Policies',
    description: 'Strategies to block cyber threats.',
    defaultsToDisabled: false,
  },
  [IngestionSources.VULNERABILITIES]: {
    title: 'Vulnerabilities',
    description: 'Identified security weaknesses.',
    defaultsToDisabled: true,
  },
  [IngestionSources.ZERO_TRUST_ASSESSMENT]: {
    title: 'Zero Trust Assessment',
    description: 'Evaluates trustworthiness of devices.',
    defaultsToDisabled: true,
  },
};
