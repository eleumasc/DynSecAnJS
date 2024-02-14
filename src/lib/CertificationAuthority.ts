import { readFileSync } from "fs";
import { join, resolve } from "path";

export default class CertificationAuthority {
  constructor(
    readonly certificate: string,
    readonly certificatePath: string,
    readonly key: string,
    readonly keyPath: string
  ) {}

  getCertificate(): string {
    return this.certificate;
  }

  getCertificatePath(): string {
    return this.certificatePath;
  }

  getKey(): string {
    return this.key;
  }

  getKeyPath(): string {
    return this.keyPath;
  }

  protected static instance: CertificationAuthority | null = null;

  static read(): CertificationAuthority {
    if (this.instance) {
      return this.instance;
    }

    const caDir = resolve("ca");

    const certificatePath = join(caDir, "cert.pem");
    const certificate = readFileSync(certificatePath).toString();

    const keyPath = join(caDir, "key.pem");
    const key = readFileSync(keyPath).toString();

    this.instance = new CertificationAuthority(
      certificate,
      certificatePath,
      key,
      keyPath
    );
    return this.instance;
  }
}
