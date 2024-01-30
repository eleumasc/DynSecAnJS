import { join } from "path";
import { Logfile, deserializeLogfile, serializeLogfile } from "./Logfile";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { LogfileAttachmentFile } from "./LogfileAttachment";

export default class Logger {
  constructor(readonly analysisId: string) {}

  persist(logfile: Logfile) {
    const { site } = logfile;
    const outDir = join("results", this.analysisId);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, `${site}.json`),
      JSON.stringify(
        LogfileAttachmentFile.saveAttachmentFiles(serializeLogfile(logfile), outDir)
      )
    );
  }

  static *read(analysisId: string): Generator<Logfile, void> {
    const outDir = join("results", analysisId);
    for (const filename of readdirSync(outDir)) {
      yield deserializeLogfile(
        JSON.parse(readFileSync(join(outDir, filename)).toString())
      );
    }
  }
}
