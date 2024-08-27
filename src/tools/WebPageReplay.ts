import { ForwardProxy, useForwardProxy } from "../util/ForwardProxy";
import { debugMode, localhost, wprgoPath } from "../env";
import { getTcpPort, waitUntilUsed } from "../util/getTcpPort";

import Deferred from "../util/Deferred";
import { spawn } from "child_process";

export type WebPageReplayOperation = "record" | "replay";

export interface WebPageReplay {
  hostname: string;
  httpPort: number;
  httpsPort: number;
}

interface WebPageReplayOptions {
  operation: WebPageReplayOperation;
  archivePath: string;
  injectDeterministic?: boolean;
  injectScripts?: string[];
}

export const useWebPageReplay = async <T>(
  options: WebPageReplayOptions,
  use: (instance: WebPageReplay) => Promise<T>
): Promise<T> => {
  const { operation, archivePath, injectDeterministic, injectScripts } =
    options;

  const [httpPort, httpsPort] = await Promise.all([getTcpPort(), getTcpPort()]);

  const childProcess = spawn(
    "./wpr",
    [
      operation,
      `--http_port=${httpPort}`,
      `--https_port=${httpsPort}`,
      `--inject_scripts=${(injectDeterministic ?? true
        ? ["deterministic.js"]
        : []
      )
        .concat(injectScripts ?? [])
        .join(",")}`,
      archivePath,
    ],
    { cwd: wprgoPath }
  );

  const deferredExit = new Deferred<void>();
  childProcess.on("exit", (code, signal) => {
    if (code !== null || signal !== "SIGINT") {
      deferredExit.reject(
        new Error(`Process has exited prematurely [${code}, ${signal}]`)
      );
    } else {
      deferredExit.resolve();
    }
  });

  if (debugMode) {
    childProcess.stderr!.pipe(process.stderr);
  } else {
    childProcess.stderr!.resume();
  }

  try {
    await waitUntilUsed(httpPort, 500, 30_000);

    return await use({
      hostname: localhost,
      httpPort,
      httpsPort,
    });
  } finally {
    childProcess.kill("SIGINT");

    await deferredExit.promise;
  }
};

export const useForwardedWebPageReplay = <T>(
  options: WebPageReplayOptions,
  use: (forwardProxy: ForwardProxy) => Promise<T>
): Promise<T> => {
  return useWebPageReplay(options, (wpr) => useForwardProxy(wpr, use));
};
