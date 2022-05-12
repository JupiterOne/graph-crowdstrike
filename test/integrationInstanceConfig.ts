import * as dotenv from 'dotenv';
import { CrowdStrikeIntegrationInstanceConfig } from '../src/types';
import path from 'path';

if (process.env.LOAD_ENV) {
  dotenv.config({
    path: path.join(__dirname, '../.env'),
  });
}

const config: CrowdStrikeIntegrationInstanceConfig = {
  clientId: process.env.CROWDSTRIKE_LOCAL_EXECUTION_CLIENT_ID || 'clientId',
  clientSecret:
    process.env.CROWDSTRIKE_LOCAL_EXECUTION_CLIENT_SECRET || 'clientSecret',
};

export default config;
