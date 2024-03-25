import { AttachmentList, DataAttachment } from "./ArchiveWriter";
import { Fallible, toFallible } from "../util/Fallible";

import { Agent } from "./Agent";
import { ExecutionDetail } from "./ExecutionDetail";
import { ExecutionHooksProvider } from "./ExecutionHooks";
import { MonitorConfig } from "./monitor";
import { Options as WebPageReplayOptions } from "./WebPageReplay";
import { timeBomb } from "../util/async";
import { useProxiedMonitor } from "./ProxiedMonitor";

export interface Options {
  url: string;
  agent: Agent;
  hooksProvider: ExecutionHooksProvider;
  compatMode: boolean;
  monitorConfig: Pick<
    MonitorConfig,
    "waitUntil" | "loadingTimeoutMs" | "timeSeedMs"
  >;
  wprOptions: Pick<WebPageReplayOptions, "operation" | "archivePath">;
  delayMs: number;
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
    delayMs,
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
        agent.usePage(
          {
            proxyPort: analysisProxy.getPort(),
          },
          async (page) => {
            const startTime = Date.now();
            await page.navigate(url);
            const completer = await timeBomb(
              willCompleteAnalysis,
              monitorConfig.loadingTimeoutMs + delayMs
            );
            const endTime = Date.now();
            const executionTimeMs = endTime - startTime;

            const screenshotFile = attachmentList?.add(
              `screenshot.png`,
              new DataAttachment(await page.screenshot())
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
