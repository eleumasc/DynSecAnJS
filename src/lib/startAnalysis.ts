import { Logfile, LogfileRecord } from "./Logfile";
import { loadSessionFromConfigModule } from "./config";
import Logger from "./Logger";
import { loadSitelistFromFile } from "./sitelist";
import { Worker, isMainThread, parentPort } from "worker_threads";
import { Agent } from "port_agent";
import { divide } from "./util/array";
import EventEmitter from "events";
import TimedAnalysisSession from "./TimedAnalysisSession";

export interface StartAnalysisArgs {
  configName: string;
  sitelistPath: string;
  concurrencyLevel: number;
}

export const startAnalysis = async (args: StartAnalysisArgs) => {
  const { configName, sitelistPath, concurrencyLevel } = args;

  const analysisId = (+new Date()).toString();
  console.log(`Analysis ID is ${analysisId}`);

  const sitelist = loadSitelistFromFile(sitelistPath);
  console.log(sitelist);
  console.log(`${sitelist.length} sites`);

  if (concurrencyLevel > 1) {
    const sitesPerThread = divide(
      sitelist,
      Math.ceil(sitelist.length / concurrencyLevel)
    );
    await Promise.all(
      sitesPerThread.map(async (sitelist, groupIndex) => {
        const worker = new Worker(__filename);
        const agent = new Agent(worker);
        try {
          await agent.call(runAnalysisThread.name, <AnalysisThreadOptions>{
            configName,
            sitelist,
            threadId: groupIndex,
            analysisId,
          });
        } finally {
          worker.terminate();
        }
      })
    );
  } else {
    await runAnalysisThread({
      configName,
      sitelist,
      threadId: 0,
      analysisId,
    });
  }

  console.log("THE END");
};

interface AnalysisThreadOptions {
  configName: string;
  sitelist: string[];
  threadId: number;
  analysisId: string;
}

const runAnalysisThread = async (
  options: AnalysisThreadOptions
): Promise<void> => {
  const { configName, sitelist, threadId, analysisId } = options;

  EventEmitter.defaultMaxListeners = 15;

  const runner = await TimedAnalysisSession.from(
    loadSessionFromConfigModule(configName)
  ).setupAnalysis();

  const logger = new Logger(analysisId);

  for (const [siteIndex, site] of Object.entries(sitelist)) {
    console.log(`begin analysis ${site} [${threadId}-${siteIndex}]`);

    const startTime = +new Date();
    const url = `http://${site}/`;

    try {
      const record = (await runner.runAnalysis(url, site)) as LogfileRecord;

      logger.persist(<Logfile>{
        site,
        startTime,
        record,
      });
    } catch {}

    console.log(`end analysis ${site}`);
  }

  await runner.terminate();
};

// worker thread
if (!isMainThread) {
  if (parentPort) {
    const agent = new Agent(parentPort);

    agent.register(
      runAnalysisThread.name,
      (options: AnalysisThreadOptions): Promise<void> =>
        runAnalysisThread(options)
    );
  }
}
