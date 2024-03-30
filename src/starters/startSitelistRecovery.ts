import { readSitelistFromFile, writeSitelistToFile } from "../core/sitelist";

import path from "path";

export interface SitelistRecoveryArgs {
  sitelistPath: string;
  archivePath: string;
  diffSitelistPath: string;
}

export const startSitelistRecovery = async (args: SitelistRecoveryArgs) => {
  const { sitelistPath, archivePath, diffSitelistPath } = args;

  const sitelist = readSitelistFromFile(path.resolve(sitelistPath));
  const archiveSites = readSitelistFromFile(
    path.join(archivePath, "sites.txt")
  );

  const diffSitelist = sitelist.filter((site) => !archiveSites.includes(site));

  writeSitelistToFile(path.resolve(diffSitelistPath), diffSitelist);
};
