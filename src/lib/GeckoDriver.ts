import { ChildProcess, spawn } from "child_process";
import { debugMode, geckoDriverPath } from "../core/env";
import { getTcpPort, waitUntilUsed } from "../core/net";

import Deferred from "../core/Deferred";
import path from "path";

export default class GeckoDriver {
  constructor(
    readonly driverHost: string,
    readonly subprocess: ChildProcess,
    readonly deferredSubprocessExit: Deferred<void>
  ) {}

  getDriverHost(): string {
    return this.driverHost;
  }

  async stop(): Promise<void> {
    this.subprocess.kill("SIGINT");
    await this.deferredSubprocessExit.promise;
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

    const deferredSubprocessExit = new Deferred<void>();
    child.on("exit", async () => {
      deferredSubprocessExit.resolve();
    });

    return new GeckoDriver(
      `127.0.0.1:${driverPort}`,
      child,
      deferredSubprocessExit
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
