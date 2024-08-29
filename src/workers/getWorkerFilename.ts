import path from "path";

export const getWorkerFilename = (workerName: string): string =>
  path.join(__dirname, workerName);
