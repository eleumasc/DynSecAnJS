import { ChildProcess, spawn } from "child_process";
import { getTcpPort, waitUntilUsed } from "./util/net";
import Deferred from "./util/Deferred";
import { certPath, keyPath } from "./ca";
import { wprgoPath } from "./env";

export type WebPageReplayOperation = "replay" | "record";

export default class WebPageReplay {
  constructor(
    readonly subprocess: ChildProcess,
    readonly httpPort: number,
    readonly httpsPort: number,
    readonly archivePath: string,
    readonly willChildExit: Deferred<void>
  ) {}

  getHttpPort(): number {
    return this.httpPort;
  }

  getHttpsPort(): number {
    return this.httpsPort;
  }

  getArchivePath(): string {
    return this.archivePath;
  }

  async stop(): Promise<void> {
    this.subprocess.kill("SIGINT");
    await this.willChildExit.promise;
  }

  static async start(
    operation: WebPageReplayOperation,
    archivePath: string
  ): Promise<WebPageReplay> {
    const ports = await Promise.all([getTcpPort(), getTcpPort()]);
    const [httpPort, httpsPort] = ports;

    const child = spawn(
      `./wpr`,
      [
        operation,
        `--http_port=${httpPort}`,
        `--https_port=${httpsPort}`,
        `--https_cert_file=${certPath}`,
        `--https_key_file=${keyPath}`,
        archivePath,
      ],
      {
        cwd: wprgoPath,
      }
    );

    child.stderr.pipe(process.stdout); // TODO: debug

    await waitUntilUsed(httpPort, 500, 30_000);

    const willChildExit = new Deferred<void>();
    child.on("exit", async () => {
      willChildExit.resolve();
    });

    return new WebPageReplay(
      child,
      httpPort,
      httpsPort,
      archivePath,
      willChildExit
    );
  }
}

export const useWebPageReplay = async (
  operation: WebPageReplayOperation,
  archivePath: string,
  cb: (wpr: WebPageReplay) => Promise<void>
) => {
  const wpr = await WebPageReplay.start(operation, archivePath);
  try {
    await cb(wpr);
  } finally {
    await wpr.stop();
  }
};
