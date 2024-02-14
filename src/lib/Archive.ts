import { join, resolve } from "path";
import { Logfile, deserializeLogfile, serializeLogfile } from "./Logfile";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { readSitelistFromFile, writeSitelistToFile } from "./sitelist";
import assert from "assert";
import { tmpdir } from "os";

export default class Archive {
  protected sitelist: string[] = [];

  constructor(readonly path: string) {}

  store(logfile: Logfile, attachmentList?: AttachmentList): void {
    const { site } = logfile;
    const outDir = resolve(this.path);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, `${site}.json`),
      JSON.stringify(serializeLogfile(logfile))
    );
    if (attachmentList) {
      attachmentList.store(outDir);
    }
    this.sitelist = [...this.sitelist, site];
    writeSitelistToFile(join(outDir, "sites.txt"), this.sitelist);
  }

  load(site: string, kind: string): Logfile {
    const outDir = resolve(this.path);
    const logfile = deserializeLogfile(
      JSON.parse(readFileSync(join(outDir, `${site}.json`)).toString())
    );
    assert(
      logfile.kind === kind,
      `Expected kind '${kind}', but got '${logfile.kind}'`
    );
    return logfile;
  }

  getSitelist(): string[] {
    const outDir = resolve(this.path);
    return readSitelistFromFile(join(outDir, "sites.txt"));
  }
}

export interface AttachmentList {
  add(filename: string, attachment: Attachment): string;
  store(outDir: string): Promise<void>;
}

export interface Attachment {
  store(path: string): Promise<void>;
}

export class DataAttachment implements Attachment {
  constructor(readonly data: string | Buffer) {}

  async store(path: string): Promise<void> {
    writeFileSync(path, this.data);
  }
}

export class FileAttachment implements Attachment {
  constructor(readonly tempPath: string) {}

  getTempPath(): string {
    return this.tempPath;
  }

  async store(path: string): Promise<void> {
    try {
      renameSync(this.tempPath, path);
    } catch {
      copyFileSync(this.tempPath, path);
      unlinkSync(this.tempPath);
    }
  }

  static create(): FileAttachment {
    const tempPath = join(tmpdir(), crypto.randomUUID());
    return new FileAttachment(tempPath);
  }
}

interface AttachmentListEntry {
  filename: string;
  attachment: Attachment;
}

export class DefaultAttachmentList implements AttachmentList {
  protected entries: AttachmentListEntry[] = [];

  add(filename: string, attachment: Attachment): string {
    this.entries.push({ filename, attachment });
    return filename;
  }

  async store(outDir: string): Promise<void> {
    for (const { filename, attachment } of this.entries) {
      const path = join(outDir, filename);
      await attachment.store(path);
    }
  }
}

export class PrefixAttachmentList implements AttachmentList {
  constructor(
    readonly attachmentList: AttachmentList,
    readonly prefix: string
  ) {}

  add(filename: string, attachment: Attachment): string {
    return this.attachmentList.add(this.prefix + filename, attachment);
  }

  async store(outDir: string): Promise<void> {
    await this.attachmentList.store(outDir);
  }
}
