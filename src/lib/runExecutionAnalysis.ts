import { AttachmentList, DataAttachment } from "./ArchiveWriter";
import { Fallible, toFallible } from "../core/Fallible";

import { Agent } from "./Agent";
import { ExecutionDetail } from "./ExecutionDetail";
import { ExecutionHooksProvider } from "./ExecutionHooks";
import { MonitorConfig } from "./monitor";
import { Options as WebPageReplayOptions } from "./WebPageReplay";
import { defaultViewport } from "../core/defaults";
import { timeBomb } from "../core/async";
import { useProxiedMonitor } from "./ProxiedMonitor";

export interface Options {
  url: string;
  agent: Agent;
  hooksProvider: ExecutionHooksProvider;
  compatMode: boolean;
  monitorConfig: Pick<MonitorConfig, "loadingTimeoutMs" | "timeSeedMs">;
  wprOptions: Pick<WebPageReplayOptions, "operation" | "archivePath">;
  toleranceMs: number;
  attachmentList?: AttachmentList;
}

export const runExecutionAnalysis = (
  options: Options
): Promise<Fallible<ExecutionDetail>> => {
  const {
    url,
    agent,
    hooksProvider,
    compatMode,
    monitorConfig,
    wprOptions,
    toleranceMs,
    attachmentList,
  } = options;

  const { hooks, willCompleteAnalysis } = hooksProvider(compatMode);
  return toFallible(() =>
    useProxiedMonitor(
      {
        hooks,
        monitorConfig,
        wprOptions,
      },
      (analysisProxy) =>
        agent.use(
          {
            proxyPort: analysisProxy.getPort(),
          },
          async (controller) => {
            await controller.setViewport(defaultViewport);

            const startTime = Date.now();
            await controller.navigate(url, monitorConfig.loadingTimeoutMs);
            const completer = await timeBomb(
              willCompleteAnalysis(),
              toleranceMs
            );
            const endTime = Date.now();
            const executionTimeMs = endTime - startTime;

            const screenshotFile = attachmentList?.add(
              `screenshot.png`,
              new DataAttachment(await controller.screenshot())
            );

            return completer({
              executionTimeMs,
              screenshotFile,
            });
          }
        )
    )
  );
};
