import * as dotenv from 'dotenv';
import { CrowdStrikeIntegrationInstanceConfig } from '../src/config';
import path from 'path';

if (process.env.LOAD_ENV) {
  dotenv.config({
    path: path.join(__dirname, '../.env'),
  });
}

const config: CrowdStrikeIntegrationInstanceConfig = {
  clientId: process.env.CLIENT_ID || 'clientId',
  clientSecret: process.env.CLIENT_SECRET || 'clientSecret',
};

export default config;
