import assert from "assert";
import path from "path";
import { Completion } from "../util/Completion";
import { Logfile } from "./Logfile";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";


export type SiteResult<TSiteData> = Completion<TSiteData>;

export type ArchiveConstructor<TLogfile extends Logfile, TSiteData> = {
  new (archivePath: string, canWrite?: boolean): Archive<TLogfile, TSiteData>;

  init<TLogfile extends Logfile, TSiteData>(
    this: ArchiveConstructor<TLogfile, TSiteData>,
    archivePath: string,
    logfile: TLogfile
  ): Archive<TLogfile, TSiteData>;

  open<TLogfile extends Logfile, TSiteData>(
    this: ArchiveConstructor<TLogfile, TSiteData>,
    archivePath: string,
    canWrite?: boolean
  ): Archive<TLogfile, TSiteData>;
};

export default class Archive<TLogfile extends Logfile, TSiteData = unknown> {
  protected _logfile: TLogfile | null = null;

  constructor(
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

  readSiteResult(site: string): SiteResult<TSiteData> {
    const dstPath = Archive.getSiteDataPath(this.archivePath, site);
    return JSON.parse(
      readFileSync(dstPath).toString()
    ) as SiteResult<TSiteData>;
  }

  writeSiteResult(site: string, result: SiteResult<TSiteData>): void {
    assert(this.canWrite);

    const dstPath = Archive.getSiteDataPath(this.archivePath, site);
    writeFileSync(dstPath, JSON.stringify(result), { flush: true });
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

  static init<TLogfile extends Logfile, TSiteData>(
    this: ArchiveConstructor<TLogfile, TSiteData>,
    archivePath: string,
    logfile: TLogfile
  ): Archive<TLogfile, TSiteData> {
    mkdirSync(archivePath, { recursive: true });

    const archive = new Archive<TLogfile, TSiteData>(archivePath, true);
    archive.logfile = logfile;
    return archive;
  }

  static open<TLogfile extends Logfile, TSiteData>(
    this: ArchiveConstructor<TLogfile, TSiteData>,
    archivePath: string,
    canWrite: boolean = false
  ): Archive<TLogfile, TSiteData> {
    assert(
      existsSync(Archive.getLogfilePath(archivePath)),
      `Cannot open archive: ${archivePath}`
    );

    return new Archive(archivePath, canWrite);
  }

  protected static getLogfilePath(archivePath: string): string {
    return path.join(archivePath, "logfile.json");
  }

  protected static getSiteDataPath(archivePath: string, site: string): string {
    return path.join(archivePath, `${site}.json`);
  }
}
