import { Mockttp as MockttpServer } from "mockttp";
import AnalysisProxy, {
  DnsLookupErrorListener,
  RequestListener,
  ResponseTransformer,
  createExposedCallback,
  createInitScript,
  useAnalysisProxy,
} from "./AnalysisProxy";
import {
  Options as WebPageReplayOptions,
  useWebPageReplay,
} from "./WebPageReplay";
import { SendReporter, MonitorWaitUntil, bundleMonitor } from "./monitor";

interface Options {
  mockttpServer: MockttpServer;
  reportCallback: (data: any) => void;
  requestListener?: RequestListener;
  responseTransformer?: ResponseTransformer;
  dnsLookupErrorListener?: DnsLookupErrorListener;
  wprOptions: Pick<
    WebPageReplayOptions,
    "operation" | "archivePath" | "certificationAuthority"
  >;
  loadingTimeoutMs: number;
  timeSeedMs: number;
  waitUntil: MonitorWaitUntil;
}

export const useProxiedMonitor = async <T>(
  options: Options,
  cb: (analysisProxy: AnalysisProxy) => Promise<T>
): Promise<T> => {
  const {
    mockttpServer,
    reportCallback,
    requestListener,
    responseTransformer,
    dnsLookupErrorListener,
    wprOptions,
    loadingTimeoutMs,
    timeSeedMs,
    waitUntil,
  } = options;

  return await useWebPageReplay(
    { ...wprOptions, injectDeterministic: false },
    async (wpr) => {
      const reportExposedCallback = createExposedCallback(reportCallback);

      const monitorInitScript = createInitScript(
        await bundleMonitor({
          reporter: <SendReporter>{
            type: "SendReporter",
            url: reportExposedCallback.url,
          },
          loadingTimeoutMs,
          timeSeedMs,
          waitUntil,
        })
      );

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
