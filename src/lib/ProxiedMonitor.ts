import AnalysisProxy, {
  createExposedCallback,
  createInitScript,
  useAnalysisProxy,
} from "./AnalysisProxy";
import { MonitorConfig, SendReporter, bundleMonitor } from "./monitor";

import CA from "../core/CA";
import { ProxiedMonitorHooks } from "./ProxiedMonitorHooks";
import { getLocal } from "mockttp";
import { useWebPageReplay } from "../tools/WebPageReplay";

interface Options {
  hooks: ProxiedMonitorHooks;
  monitorConfig: Pick<
    MonitorConfig,
    "loadingTimeoutMs" | "timeSeedMs" | "ifaToolName"
  >;
  wprOptions: any;
}

export const useProxiedMonitor = async <T>(
  options: Options,
  cb: (analysisProxy: AnalysisProxy) => Promise<T>
): Promise<T> => {
  throw new Error("Not implemented");
  // const {
  //   hooks: {
  //     reportCallback,
  //     requestListener,
  //     responseTransformer,
  //     dnsLookupErrorListener,
  //   },
  //   monitorConfig,
  //   wprOptions,
  // } = options;

  // return await useWebPageReplay(
  //   {
  //     ...wprOptions,
  //     injectDeterministic: false,
  //   },
  //   async (wpr) => {
  //     const reportExposedCallback = createExposedCallback(reportCallback);

  //     const monitorInitScript = createInitScript(
  //       await bundleMonitor({
  //         reporter: <SendReporter>{
  //           type: "SendReporter",
  //           url: reportExposedCallback.url,
  //         },
  //         ...monitorConfig,
  //       })
  //     );

  //     const mockttpServer = getLocal({
  //       https: {
  //         cert: CA.getInstance().getCertificate(),
  //         key: CA.getInstance().getKey(),
  //       },
  //       recordTraffic: false,
  //     });

  //     return await useAnalysisProxy(
  //       mockttpServer,
  //       {
  //         exposedCallbacks: [reportExposedCallback],
  //         initScripts: [monitorInitScript],
  //         requestListener,
  //         responseTransformer,
  //         dnsLookupErrorListener,
  //         httpForwardHost: wpr.getHttpHost(),
  //         httpsForwardHost: wpr.getHttpsHost(),
  //       },
  //       cb
  //     );
  //   }
  // );
};
