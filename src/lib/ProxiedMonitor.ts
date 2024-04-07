import { getLocal } from "mockttp";
import AnalysisProxy, {
  createExposedCallback,
  createInitScript,
  useAnalysisProxy,
} from "./AnalysisProxy";
import {
  Options as WebPageReplayOptions,
  useWebPageReplay,
} from "./WebPageReplay";
import { SendReporter, bundleMonitor, MonitorConfig } from "./monitor";
import CA from "../core/CA";
import { ProxiedMonitorHooks } from "./ProxiedMonitorHooks";

interface Options {
  hooks: ProxiedMonitorHooks;
  monitorConfig: Pick<MonitorConfig, "loadingTimeoutMs" | "timeSeedMs">;
  wprOptions: Pick<WebPageReplayOptions, "operation" | "archivePath">;
}

export const useProxiedMonitor = async <T>(
  options: Options,
  cb: (analysisProxy: AnalysisProxy) => Promise<T>
): Promise<T> => {
  const {
    hooks: {
      reportCallback,
      requestListener,
      responseTransformer,
      dnsLookupErrorListener,
    },
    monitorConfig,
    wprOptions,
  } = options;

  return await useWebPageReplay(
    {
      ...wprOptions,
      injectDeterministic: false,
    },
    async (wpr) => {
      const reportExposedCallback = createExposedCallback(reportCallback);

      const monitorInitScript = createInitScript(
        await bundleMonitor({
          reporter: <SendReporter>{
            type: "SendReporter",
            url: reportExposedCallback.url,
          },
          ...monitorConfig,
        })
      );

      const mockttpServer = getLocal({
        https: {
          cert: CA.get().getCertificate(),
          key: CA.get().getKey(),
        },
        recordTraffic: false,
      });

      return await useAnalysisProxy(
        mockttpServer,
        {
          exposedCallbacks: [reportExposedCallback],
          initScripts: [monitorInitScript],
          requestListener,
          responseTransformer,
          dnsLookupErrorListener,
          httpForwardHost: wpr.getHttpHost(),
          httpsForwardHost: wpr.getHttpsHost(),
        },
        cb
      );
    }
  );
};
