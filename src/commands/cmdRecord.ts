import path from "path";
import { Args } from "../archive/Args";
import { createSitesState } from "../archive/SitesState";
import { initCommand } from "../archive/initCommand";
import { ipExec } from "../util/interprocess";
import { isFailure, toCompletion } from "../util/Completion";
import { readSitelistFromFile } from "../util/sitelist";
import { RecordArchive } from "../archive/RecordArchive";
import { RecordSiteArgs, recordSiteFilename } from "../workers/recordSite";
import {
  ResumableProcessSitesController,
  processSites,
} from "../archive/processSites";

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

  await processSites(
    new ResumableProcessSitesController(archive),
    concurrencyLimit,
    async (site) => {
      const { archivePath } = archive;
      const outerCompletion = await toCompletion(async () => {
        const innerCompletion = await ipExec(recordSiteFilename, [
          {
            site,
            archivePath,
          } satisfies RecordSiteArgs,
        ]);
        if (isFailure(innerCompletion)) {
          archive.writeSiteResult(site, innerCompletion);
        }
      });
      if (isFailure(outerCompletion)) {
        archive.writeSiteResult(site, outerCompletion);
      }
    }
  );

  process.exit(0);
};
