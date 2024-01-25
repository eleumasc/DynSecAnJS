import { LogfileRecord } from "./Logfile";
import { loadSessionFromConfigModule } from "./config";
import Logger from "./Logger";
import { loadSitelistFromFile } from "./sitelist";

export interface StartAnalysisArgs {
  configName: string;
  sitelistPath: string;
}

export const startAnalysis = async (args: StartAnalysisArgs) => {
  const { configName, sitelistPath } = args;

  const runner = await loadSessionFromConfigModule(configName).setupAnalysis();

  const sitelist = loadSitelistFromFile(sitelistPath);
  console.log(sitelist);
  console.log(`${sitelist.length} sites`);

  const analysisId = (+new Date()).toString();
  const logger = new Logger(analysisId);
  console.log(`Analysis ID is ${analysisId}`);

  for (const [siteIndex, site] of Object.entries(sitelist)) {
    console.log(`begin analysis ${site} [${siteIndex}]`);

    const url = `http://${site}/`;
    const record = (await runner.runAnalysis(url)) as LogfileRecord;

    logger.persist({ site, record });

    console.log(`end analysis ${site}`);
  }

  await runner.terminate();
  console.log("THE END");
};
