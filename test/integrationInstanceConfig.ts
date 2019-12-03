import { CrowdStrikeIntegrationInstanceConfig } from "../src/types";

const config: CrowdStrikeIntegrationInstanceConfig = {
  clientId: process.env.CROWDSTRIKE_LOCAL_EXECUTION_CLIENT_ID || "clientId",
  clientSecret:
    process.env.CROWDSTRIKE_LOCAL_EXECUTION_CLIENT_SECRET || "clientSecret",
};

export default config;
