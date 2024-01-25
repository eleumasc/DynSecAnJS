import { loadSessionFromConfigModule } from "./config";
import Logger from "./Logger";

export interface StartMeasurementArgs {
  configName: string;
  analysisId: string;
}

export const startMeasurement = async (args: StartMeasurementArgs) => {
  const { configName, analysisId } = args;

  const runner = await loadSessionFromConfigModule(
    configName
  ).setupMeasurement();

  for (const logfile of Logger.read(analysisId)) {
    await runner.runMeasurement(logfile.record, logfile);
  }

  await runner.report();
};
