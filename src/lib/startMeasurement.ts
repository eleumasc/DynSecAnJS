import { measure } from "./measure";
import Archive from "./Archive";

export interface StartMeasurementArgs {
  archivePath: string;
}

export const startMeasurement = async (args: StartMeasurementArgs) => {
  const { archivePath } = args;

  const archive = new Archive(archivePath);
  const sitelist = archive.getSitelist();

  const tableRows: string[][] = [];
  for (const archiveSite of sitelist) {
    const logfile = archive.load(archiveSite, "execution");
    const { site, result } = logfile;
    tableRows.push([site, ...measure(result)]);
  }

  console.table(tableRows);
};
