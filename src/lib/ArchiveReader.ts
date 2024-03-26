import { Logfile, deserializeLogfile } from "./Logfile";

import assert from "assert";
import nodePath from "path";
import { readFileSync } from "fs";
import { readSitelistFromFile } from "../core/sitelist";

export default class ArchiveReader<Kind extends string, Data> {
  constructor(
    readonly path: string,
    readonly kind: Kind,
    readonly deserializeData: (rawData: any) => Data
  ) {}

  load(site: string): Logfile<Kind, Data> {
    const outDir = nodePath.resolve(this.path);
    const logfile = deserializeLogfile(
      JSON.parse(
        readFileSync(nodePath.join(outDir, `${site}.json`)).toString()
      ),
      this.kind,
      this.deserializeData
    );
    assert(
      logfile.kind === this.kind,
      `Expected kind '${this.kind}', but got '${logfile.kind}'`
    );
    return logfile;
  }

  getSitelist(): string[] {
    const outDir = nodePath.resolve(this.path);
    return readSitelistFromFile(nodePath.join(outDir, "sites.txt"));
  }
}
