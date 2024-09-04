import path from "path";
import { isSuccess, Success } from "../util/Completion";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { SiteResult } from "../archive/Archive";
import {
  CollectLogfile,
  CollectReport,
  RunDetail,
} from "../archive/CollectArchive";

type OldCollectSiteResult = SiteResult<OldCollectReport>;

interface OldCollectReport {
  transpiled: boolean;
  runs: OldRunDetail[];
}

interface OldRunDetail {
  monitorState: OldMonitorState;
  executionTime: number;
}

type OldMonitorState =
  | {
      loadingCompleted: false;
    }
  | {
      loadingCompleted: true;
      uncaughtErrors: string[];
      rawFlows: any;
    };

const REDO_SITE = {};

const migrateCollectSiteResult = (
  oldSiteResult: OldCollectSiteResult
): SiteResult<CollectReport> => {
  if (isSuccess(oldSiteResult)) {
    const { value: oldReport } = oldSiteResult;
    return Success({
      transpiled: oldReport.transpiled,
      transformErrors: [],
      runsCompletion: Success(
        oldReport.runs.map((oldRun) => migrateRunDetail(oldRun))
      ),
    });
  } else {
    throw REDO_SITE;
  }
};

const migrateRunDetail = (oldRun: OldRunDetail): RunDetail => {
  const { monitorState, executionTime } = oldRun;
  if (!monitorState.loadingCompleted) {
    throw REDO_SITE;
  }
  return {
    monitorState: {
      loadingCompleted: true,
      uncaughtErrors: monitorState.uncaughtErrors,
      rawFlows: null,
    },
    executionTime,
  };
};

const updateLogfile = (
  oldCollectLogfile: CollectLogfile,
  redoSites: string[]
): CollectLogfile => {
  const {
    type,
    browserOrToolName,
    preanalyzeArchiveName,
    sitesState: oldSitesState,
  } = oldCollectLogfile;

  return {
    type,
    browserOrToolName,
    preanalyzeArchiveName,
    sitesState: Object.fromEntries(
      Object.entries(oldSitesState).map(([site, isProcessed]) => {
        return [site, !redoSites.includes(site)];
      })
    ),
  };
};

async function main() {
  const [oldCollectArchivePath, newCollectArchivePath] = process.argv.slice(2);

  mkdirSync(newCollectArchivePath);

  const oldCollectLogfile = JSON.parse(
    readFileSync(path.resolve(oldCollectArchivePath, "logfile.json")).toString()
  ) as CollectLogfile;

  const redoSites: string[] = [];

  for (const [site, isProcessed] of Object.entries(
    oldCollectLogfile.sitesState
  )) {
    if (!isProcessed) continue;

    const oldSiteResult = JSON.parse(
      readFileSync(
        path.resolve(oldCollectArchivePath, `${site}.json`)
      ).toString()
    ) as OldCollectSiteResult;

    try {
      const siteResult = migrateCollectSiteResult(oldSiteResult);
      writeFileSync(
        path.resolve(newCollectArchivePath, `${site}.json`),
        JSON.stringify(siteResult)
      );
    } catch (e) {
      if (e === REDO_SITE) {
        redoSites.push(site);
      } else {
        console.error(e);
      }
    }
  }

  writeFileSync(
    path.resolve(newCollectArchivePath, "logfile.json"),
    JSON.stringify(updateLogfile(oldCollectLogfile, redoSites))
  );
}

main();
