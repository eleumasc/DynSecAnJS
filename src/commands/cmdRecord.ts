import path from "path";
import workerpool from "workerpool";
import { Args } from "../archive/Args";
import { createSitesState } from "../archive/SitesState";
import { initCommand } from "../archive/initCommand";
import { readSitelistFromFile } from "../util/sitelist";
import { RecordArchive } from "../archive/RecordArchive";
import { retryOnce } from "../util/retryOnce";
import {
  ArchiveProcessSitesController,
  processSites,
} from "../util/processSites";
import {
  recordSite,
  RecordSiteArgs,
  recordSiteFilename,
} from "../workers/recordSite";

export type RecordArgs = Args<
  {
    sitelistPath: string;
    workingDirectory: string;
  },
  {
    concurrencyLimit: number;
  }
>;

export const cmdRecord = async (args: RecordArgs) => {
  const {
    archive,
    processArgs: { concurrencyLimit },
  } = initCommand(args, RecordArchive, {
    getPrefix(requireArgs) {
      return path.resolve(requireArgs.workingDirectory, "Record");
    },
    createLogfile(requireArgs) {
      const sitelist = readSitelistFromFile(requireArgs.sitelistPath);
      return {
        type: "RecordLogfile",
        sitesState: createSitesState(sitelist),
      };
    },
  });

  console.log(`${Object.entries(archive.logfile.sitesState).length} sites`);

  const pool = workerpool.pool(recordSiteFilename, {
    workerType: "process",
  });
  await processSites(
    new ArchiveProcessSitesController(archive),
    concurrencyLimit,
    async (site) => {
      const { archivePath } = archive;
      await retryOnce(async () => {
        await pool.exec(recordSite.name, [
          {
            site,
            archivePath,
          } satisfies RecordSiteArgs,
        ]);
      });
    }
  );
};
