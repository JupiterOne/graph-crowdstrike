import { createIntegrationEntity } from '@jupiterone/integration-sdk-core';
import { Application } from '../../crowdstrike/types';
import { DiscoverEntities } from './constants';

export function createApplicationEntity(source: Application) {
  return createIntegrationEntity({
    entityData: {
      source,
      assign: {
        _class: DiscoverEntities.APPLICATION._class,
        _type: DiscoverEntities.APPLICATION._type,
        _key: '',
      },
    },
  });
}
