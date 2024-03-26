import { Fallible, toFallible } from "../core/Fallible";

import { Agent } from "./Agent";
import { CompatibilityDetail } from "../compatibility/CompatibilityDetail";
import { CompatibilityHooksProvider } from "./CompatibilityHooks";
import { MonitorConfig } from "./monitor";
import { Options as WebPageReplayOptions } from "./WebPageReplay";
import { timeBomb } from "../core/async";
import { useProxiedMonitor } from "./ProxiedMonitor";

export interface Options {
  url: string;
  agent: Agent;
  hooksProvider: CompatibilityHooksProvider;
  monitorConfig: Pick<
    MonitorConfig,
    "waitUntil" | "loadingTimeoutMs" | "timeSeedMs"
  >;
  wprOptions: Pick<WebPageReplayOptions, "operation" | "archivePath">;
  delayMs: number;
}

export const runCompatibilityAnalysis = (
  options: Options
): Promise<Fallible<CompatibilityDetail>> => {
  const { url, agent, hooksProvider, monitorConfig, wprOptions, delayMs } =
    options;

  const { hooks, willCompleteAnalysis } = hooksProvider();
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
            await page.navigate(url);
            const compatibility = await timeBomb(
              willCompleteAnalysis,
              monitorConfig.loadingTimeoutMs + delayMs
            );

            return compatibility;
          }
        )
    )
  );
};
