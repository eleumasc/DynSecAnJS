import { debugMode, localhost, wprgoPath } from "../env";
import { ForwardProxy, useForwardProxy } from "../util/ForwardProxy";
import { getTcpPort, waitUntilUsed } from "../util/getTcpPort";
import { spawn } from "child_process";
import { useChildProcess } from "../util/ChildProcess";

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

  return await useChildProcess(
    spawn(
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
    ),
    async (childProcess, controller) => {
      if (debugMode) {
        childProcess.stderr!.pipe(process.stderr);
      } else {
        childProcess.stderr!.resume();
      }

      try {
        await waitUntilUsed(httpPort, 500, 30_000);

        return await new Promise((res, rej) => {
          childProcess.on("error", (err) => {
            rej(err);
          });

          childProcess.on("exit", (code) => {
            rej(new Error(`Process has exited prematurely with code ${code}`));
          });

          use({
            hostname: localhost,
            httpPort,
            httpsPort,
          }).then(res, rej);
        });
      } finally {
        await controller.kill("SIGINT");
      }
    }
  );
};

export const useForwardedWebPageReplay = <T>(
  options: WebPageReplayOptions,
  use: (forwardProxy: ForwardProxy) => Promise<T>
): Promise<T> => {
  return useWebPageReplay(options, (wpr) => useForwardProxy(wpr, use));
};
