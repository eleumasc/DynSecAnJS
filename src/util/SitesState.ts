
export type SitesState = Record<string, boolean>;

export const createSitesState = (sites?: string[]): SitesState => Object.fromEntries(sites?.map((site) => [site, false]) ?? []);

export const createSitesStateFrom = (sitesState: SitesState): SitesState => createSitesState(getProcessedSitesInSitesState(sitesState));

export const getSitesInSitesState = (sitesState: SitesState): string[] => Object.keys(sitesState);

export const getProcessedSitesInSitesState = (
  sitesState: SitesState
): string[] => Object.entries(sitesState)
  .filter(([, isProcessed]) => isProcessed)
  .map(([site]) => site);
