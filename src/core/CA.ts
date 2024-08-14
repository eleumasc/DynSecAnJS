import { generateSPKIFingerprint } from "mockttp";
import path from "path";
import { readFileSync } from "fs";

export default class CA {
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

  getSPKIFingerprint(): string {
    return generateSPKIFingerprint(this.certificate);
  }

  protected static instance: CA | null = null;

  static getInstance(): CA {
    if (this.instance) {
      return this.instance;
    }

    const caDir = path.resolve("ca");

    const certificatePath = path.join(caDir, "cert.pem");
    const certificate = readFileSync(certificatePath).toString();

    const keyPath = path.join(caDir, "key.pem");
    const key = readFileSync(keyPath).toString();

    this.instance = new CA(certificate, certificatePath, key, keyPath);
    return this.instance;
  }
}
