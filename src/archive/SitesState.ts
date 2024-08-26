export type SitesState = Record<string, boolean>;

export interface HasSitesState {
  sitesState: SitesState;
}

export const createSitesState = (sites: string[]): SitesState =>
  Object.fromEntries(sites.map((site) => [site, false]));

export const getSitesInSitesState = (sitesState: SitesState): string[] =>
  Object.keys(sitesState);

export const getProcessedSitesInSitesState = (
  sitesState: SitesState
): string[] =>
  Object.entries(sitesState)
    .filter(([, isProcessed]) => isProcessed)
    .map(([site]) => site);
