import { ChildProcess, spawn } from "child_process";
import { debugMode, geckoDriverPath, localhost } from "../core/env";
import { getTcpPort, waitUntilUsed } from "../core/net";

import Deferred from "../core/Deferred";
import path from "path";

export default class GeckoDriver {
  constructor(
    readonly driverHost: string,
    readonly childProcess: ChildProcess,
    readonly deferredChildProcessClose: Deferred<void>
  ) {}

  getDriverHost(): string {
    return this.driverHost;
  }

  async stop(): Promise<void> {
    this.childProcess.kill("SIGINT");
    await this.deferredChildProcessClose.promise;
  }

  static async start(): Promise<GeckoDriver> {
    const driverPort = await getTcpPort();

    const child = spawn(path.join(geckoDriverPath, "geckodriver"), [
      "--port",
      driverPort.toString(),
    ]);

    if (debugMode) {
      child.stderr.pipe(process.stdout);
    }

    await waitUntilUsed(driverPort, 500, 30_000);

    const deferredChildProcessClose = new Deferred<void>();
    child.on("close", async () => {
      deferredChildProcessClose.resolve();
    });

    return new GeckoDriver(
      `${localhost}:${driverPort}`,
      child,
      deferredChildProcessClose
    );
  }
}

export const useGeckoDriver = async <T>(
  cb: (wpr: GeckoDriver) => Promise<T>
) => {
  const geckoDriver = await GeckoDriver.start();
  try {
    return await cb(geckoDriver);
  } finally {
    await geckoDriver.stop();
  }
};
