import { ChildProcess, spawn } from "child_process";
import { debugMode, wprgoPath } from "../core/env";
import { getTcpPort, waitUntilUsed } from "../core/net";

import CA from "../core/CA";
import Deferred from "../core/Deferred";

export type WebPageReplayOperation = "replay" | "record";

export interface Options {
  operation: WebPageReplayOperation;
  archivePath: string;
  injectDeterministic?: boolean;
}

export default class WebPageReplay {
  constructor(
    readonly httpHost: string,
    readonly httpsHost: string,
    readonly subprocess: ChildProcess,
    readonly deferredSubprocessExit: Deferred<void>
  ) {}

  getHttpHost(): string {
    return this.httpHost;
  }

  getHttpsHost(): string {
    return this.httpsHost;
  }

  async stop(): Promise<void> {
    this.subprocess.kill("SIGINT");
    await this.deferredSubprocessExit.promise;
  }

  static async start(options: Options): Promise<WebPageReplay> {
    const { operation, archivePath, injectDeterministic } = options;

    const ports = await Promise.all([getTcpPort(), getTcpPort()]);
    const [httpPort, httpsPort] = ports;

    const child = spawn(
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
    );

    if (debugMode) {
      child.stderr.pipe(process.stdout);
    }

    await waitUntilUsed(httpPort, 500, 30_000);

    const deferredSubprocessExit = new Deferred<void>();
    child.on("exit", async () => {
      deferredSubprocessExit.resolve();
    });

    return new WebPageReplay(
      `127.0.0.1:${httpPort}`,
      `127.0.0.1:${httpsPort}`,
      child,
      deferredSubprocessExit
    );
  }
}

export const useWebPageReplay = async <T>(
  options: Options,
  cb: (wpr: WebPageReplay) => Promise<T>
) => {
  const wpr = await WebPageReplay.start(options);
  try {
    return await cb(wpr);
  } finally {
    await wpr.stop();
  }
};
