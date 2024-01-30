import { join } from "path";
import { writeFileSync } from "fs";

export type LogfileAttachment = string | LogfileAttachmentFile;

export class LogfileAttachmentFile {
  constructor(readonly filename: string, readonly content: string | Buffer) {}

  save(outDir: string): string {
    const path = join(outDir, this.filename);
    writeFileSync(path, this.content);
    return path;
  }

  static saveAttachmentFiles(value: any, outDir: string) {
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        return value.map((element): any =>
          LogfileAttachmentFile.saveAttachmentFiles(element, outDir)
        );
      } else if (value instanceof LogfileAttachmentFile) {
        return value.save(outDir);
      }
      return Object.fromEntries(
        Object.entries(value).map(([key, value]): [string, unknown] => [
          key,
          LogfileAttachmentFile.saveAttachmentFiles(value, outDir),
        ])
      );
    }
    return value;
  }
}
