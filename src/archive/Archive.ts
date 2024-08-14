import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";

import { Logfile } from "./Logfile";
import _ from "lodash";
import assert from "assert";
import path from "path";

export default class Archive {
  protected _logfile: Logfile | null = null;

  constructor(
    readonly archivePath: string,
    readonly canWrite: boolean = false
  ) {}

  get logfile() {
    return (
      this._logfile ??
      (this._logfile = JSON.parse(
        readFileSync(Archive.getLogfilePath(this.archivePath)).toString()
      ) as Logfile)
    );
  }

  protected set logfile(logfile: Logfile) {
    this._logfile = logfile;

    writeFileSync(
      Archive.getLogfilePath(this.archivePath),
      JSON.stringify(this.logfile)
    );
  }

  get remainingSites(): string[] {
    return _.difference(this.logfile.todoSites, this.logfile.sites);
  }

  markSiteAsDone(site: string): void {
    assert(this.canWrite);

    const { logfile } = this;
    this.logfile = { ...logfile, sites: [...logfile.sites, site] };
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

  moveFile(name: string, srcPath: string): void {
    assert(this.canWrite);

    const dstPath = path.join(this.archivePath, name);
    try {
      renameSync(srcPath, dstPath);
    } catch {
      copyFileSync(srcPath, dstPath);
    }
  }

  static init(
    archivePath: string,
    type: string,
    creationTime: number,
    todoSites: string[]
  ): Archive {
    archivePath = path.resolve(archivePath);

    mkdirSync(archivePath, { recursive: true });

    const archive = new Archive(archivePath, true);

    archive.logfile = {
      type,
      creationTime,
      todoSites,
      sites: [],
    };

    return archive;
  }

  static open(archivePath: string, canWrite: boolean): Archive {
    archivePath = path.resolve(archivePath);

    assert(existsSync(Archive.getLogfilePath(archivePath)));

    return new Archive(archivePath, canWrite);
  }

  protected static getLogfilePath(archivePath: string): string {
    return path.join(archivePath, "logfile.json");
  }
}
