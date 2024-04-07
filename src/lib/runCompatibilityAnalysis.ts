import { Fallible, toFallible } from "../core/Fallible";

import { Agent } from "./Agent";
import { CompatibilityDetail } from "../compatibility/CompatibilityDetail";
import { CompatibilityHooksProvider } from "./CompatibilityHooks";
import { MonitorConfig } from "./monitor";
import { Options as WebPageReplayOptions } from "./WebPageReplay";
import { defaultViewport } from "../core/defaults";
import { timeBomb } from "../core/async";
import { useProxiedMonitor } from "./ProxiedMonitor";

export interface Options {
  url: string;
  agent: Agent;
  hooksProvider: CompatibilityHooksProvider;
  monitorConfig: Pick<MonitorConfig, "loadingTimeoutMs" | "timeSeedMs">;
  wprOptions: Pick<WebPageReplayOptions, "operation" | "archivePath">;
  toleranceMs: number;
}

export const runCompatibilityAnalysis = (
  options: Options
): Promise<Fallible<CompatibilityDetail>> => {
  const { url, agent, hooksProvider, monitorConfig, wprOptions, toleranceMs } =
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
        agent.use(
          {
            proxyPort: analysisProxy.getPort(),
          },
          async (controller) => {
            await controller.setViewport(defaultViewport);

            await controller.navigate(url);
            const compatibility = await timeBomb(
              willCompleteAnalysis(),
              monitorConfig.loadingTimeoutMs + toleranceMs
            );

            return compatibility;
          }
        )
    )
  );
};
