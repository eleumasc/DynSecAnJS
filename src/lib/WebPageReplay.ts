import { debugMode, localhost, wprgoPath } from "../core/env";
import { getTcpPort, waitUntilUsed } from "../core/net";

import CA from "../core/CA";
import { spawn } from "child_process";
import { useChildProcess } from "../core/process";

export type WebPageReplayOperation = "replay" | "record";

export interface Options {
  operation: WebPageReplayOperation;
  archivePath: string;
  injectDeterministic?: boolean;
}

export default class WebPageReplay {
  constructor(readonly httpHost: string, readonly httpsHost: string) {}

  getHttpHost(): string {
    return this.httpHost;
  }

  getHttpsHost(): string {
    return this.httpsHost;
  }
}

export const useWebPageReplay = async <T>(
  options: Options,
  cb: (instance: WebPageReplay) => Promise<T>
) => {
  const { operation, archivePath, injectDeterministic } = options;

  const ports = await Promise.all([getTcpPort(), getTcpPort()]);
  const [httpPort, httpsPort] = ports;

  return await useChildProcess(
    {
      childProcess: spawn(
        "./wpr",
        [
          operation,
          `--http_port=${httpPort}`,
          `--https_port=${httpsPort}`,
          `--https_cert_file=${CA.get().getCertificatePath()}`,
          `--https_key_file=${CA.get().getKeyPath()}`,
          ...(injectDeterministic ?? true ? [] : ["--inject_scripts="]),
          archivePath,
        ],
        {
          cwd: wprgoPath,
        }
      ),

      terminate: async (childProcess) => {
        childProcess.kill("SIGINT");
      },
    },

    async (childProcess) => {
      await waitUntilUsed(httpPort, 500, 30_000);

      if (debugMode) {
        childProcess.stderr?.pipe(process.stdout);
      }

      return await cb(
        new WebPageReplay(
          `${localhost}:${httpPort}`,
          `${localhost}:${httpsPort}`
        )
      );
    }
  );
};
