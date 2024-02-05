import { readFileSync } from "fs";
import { join, resolve } from "path";

export const caDir = resolve("ca");
export const certPath = join(caDir, "cert.pem");
export const keyPath = join(caDir, "key.pem");

export const readCA = async (): Promise<{ cert: string; key: string }> => {
  const cert = readFileSync(certPath).toString();
  const key = readFileSync(keyPath).toString();
  return { cert, key };
};
