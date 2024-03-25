import { Logfile, deserializeLogfile } from "./Logfile";
import { join, resolve } from "path";

import assert from "assert";
import { readFileSync } from "fs";
import { readSitelistFromFile } from "./sitelist";

export default class ArchiveReader<Kind extends string, Data> {
  constructor(
    readonly path: string,
    readonly kind: Kind,
    readonly deserializeData: (rawData: any) => Data
  ) {}

  load(site: string): Logfile<Kind, Data> {
    const outDir = resolve(this.path);
    const logfile = deserializeLogfile(
      JSON.parse(readFileSync(join(outDir, `${site}.json`)).toString()),
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
    const outDir = resolve(this.path);
    return readSitelistFromFile(join(outDir, "sites.txt"));
  }
}
