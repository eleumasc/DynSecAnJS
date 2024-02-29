import { measure } from "./measure";
import ArchiveReader from "./ArchiveReader";
import { deserializeOriginalAnalysisResult } from "./OriginalAnalysis";
import { deserializeToolAnalysisResult } from "./ToolAnalysis";

export interface MeasurementArgs {
  originalArchivePath: string;
  toolArchivePath: string;
}

export const startMeasurement = async (args: MeasurementArgs) => {
  const { originalArchivePath, toolArchivePath } = args;

  const originalArchive = new ArchiveReader(
    originalArchivePath,
    "original-analysis",
    deserializeOriginalAnalysisResult
  );
  const originalSitelist = originalArchive.getSitelist();
  const toolArchive = new ArchiveReader(
    originalArchivePath,
    "tool-analysis",
    deserializeToolAnalysisResult
  );
  const toolSitelist = toolArchive.getSitelist();

  const tableRows: string[][] = [];
  for (const site of originalSitelist) {
    if (!toolSitelist.includes(site)) {
      continue;
    }
    const originalLogfile = originalArchive.load(site);
    const toolLogfile = toolArchive.load(site);
    tableRows.push([site, ...measure(originalLogfile.data, toolLogfile.data)]);
  }

  console.table(tableRows);
};
