import { debugMode, geckoDriverPath, localhost } from "../env";
import { getTcpPort, waitUntilUsed } from "../util/getTcpPort";

import path from "path";
import { spawn } from "child_process";
import { useChildProcess } from "../core/process";

export default class GeckoDriver {
  constructor(readonly driverHost: string) {}

  getDriverHost(): string {
    return this.driverHost;
  }
}

export const useGeckoDriver = async <T>(
  cb: (instance: GeckoDriver) => Promise<T>
) => {
  const driverPort = await getTcpPort();

  return await useChildProcess(
    {
      childProcess: spawn(path.join(geckoDriverPath, "geckodriver"), [
        "--port",
        driverPort.toString(),
      ]),
    },

    async (childProcess) => {
      await waitUntilUsed(driverPort, 500, 30_000);

      if (debugMode) {
        childProcess.stderr?.pipe(process.stdout);
      }

      return await cb(new GeckoDriver(`${localhost}:${driverPort}`));
    }
  );
};
