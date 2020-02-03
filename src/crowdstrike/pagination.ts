/**
 * The number of resources to request per resource API call (pagination `limit`).
 */
export function getPageLimit(name: string, defaultLimit: number): number {
  return getEnvValue(
    `CROWDSTRIKE_${name.toUpperCase()}_PAGE_LIMIT`,
    defaultLimit,
  );
}

/**
 * The number of pages to process per iteration.
 */
export function getBatchPages(name: string, defaultLimit: number): number {
  return getEnvValue(
    `CROWDSTRIKE_${name.toUpperCase()}_BATCH_PAGES`,
    defaultLimit,
  );
}

function getEnvValue(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (value) {
    return Number(value);
  } else {
    return defaultValue;
  }
}
