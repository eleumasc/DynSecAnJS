import { getLocal } from "mockttp";
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
import CertificationAuthority from "./CertificationAuthority";

interface Options {
  reportCallback: (data: any) => void;
  requestListener?: RequestListener;
  responseTransformer?: ResponseTransformer;
  dnsLookupErrorListener?: DnsLookupErrorListener;
  wprOptions: Pick<WebPageReplayOptions, "operation" | "archivePath">;
  loadingTimeoutMs: number;
  timeSeedMs: number;
  waitUntil: MonitorWaitUntil;
  certificationAuthority: CertificationAuthority;
}

export const useProxiedMonitor = async <T>(
  options: Options,
  cb: (analysisProxy: AnalysisProxy) => Promise<T>
): Promise<T> => {
  const {
    reportCallback,
    requestListener,
    responseTransformer,
    dnsLookupErrorListener,
    wprOptions,
    loadingTimeoutMs,
    timeSeedMs,
    waitUntil,
    certificationAuthority,
  } = options;

  return await useWebPageReplay(
    {
      ...wprOptions,
      certificationAuthority,
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
          loadingTimeoutMs,
          timeSeedMs,
          waitUntil,
        })
      );

      const mockttpServer = getLocal({
        https: {
          cert: certificationAuthority.getCertificate(),
          key: certificationAuthority.getKey(),
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
