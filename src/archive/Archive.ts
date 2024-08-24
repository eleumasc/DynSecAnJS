import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";

import { Logfile } from "./Logfile";
import assert from "assert";
import path from "path";

export default class Archive<TLogfile extends Logfile> {
  protected _logfile: TLogfile | null = null;

  protected constructor(
    readonly archivePath: string,
    readonly canWrite: boolean = false
  ) {}

  get logfile(): TLogfile {
    return (
      this._logfile ??
      (this._logfile = JSON.parse(
        readFileSync(Archive.getLogfilePath(this.archivePath)).toString()
      ) as TLogfile)
    );
  }

  set logfile(logfile: TLogfile) {
    this._logfile = logfile;

    writeFileSync(
      Archive.getLogfilePath(this.archivePath),
      JSON.stringify(this.logfile)
    );
  }

  readData<T>(name: string): T {
    const dstPath = path.join(this.archivePath, name);
    return JSON.parse(readFileSync(dstPath).toString()) as T;
  }

  writeData<T>(name: string, data: T): void {
    assert(this.canWrite);

    const dstPath = path.join(this.archivePath, name);
    writeFileSync(dstPath, JSON.stringify(data));
  }

  getFilePath(name: string): string {
    return path.join(this.archivePath, name);
  }

  moveFile(name: string, srcPath: string): void {
    assert(this.canWrite);

    const dstPath = path.join(this.archivePath, name);
    try {
      renameSync(srcPath, dstPath);
    } catch {
      copyFileSync(srcPath, dstPath);
    }
  }

  static init<TLogfile extends Logfile>(
    archivePath: string,
    logfile: TLogfile
  ): Archive<TLogfile> {
    mkdirSync(archivePath, { recursive: true });

    const archive = new Archive<TLogfile>(archivePath, true);
    archive.logfile = logfile;
    return archive;
  }

  static open<TLogfile extends Logfile>(
    archivePath: string,
    canWrite: boolean = false
  ): Archive<TLogfile> {
    assert(
      existsSync(Archive.getLogfilePath(archivePath)),
      `Cannot open archive: ${archivePath}`
    );

    return new Archive(archivePath, canWrite);
  }

  protected static getLogfilePath(archivePath: string): string {
    return path.join(archivePath, "logfile.json");
  }
}
