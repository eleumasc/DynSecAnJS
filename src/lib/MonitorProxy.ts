import { randomUUID } from "crypto";
import { lookup as dnsLookup } from "dns/promises";
import { CompletedRequest, Mockttp as MockttpServer } from "mockttp";
import { PassThroughHandlerOptions } from "mockttp/dist/rules/requests/request-handler-definitions";
import { ExecutionDetail } from "./ExecutionAnalysis";
import FeatureSet from "./FeatureSet";
import { injectScript } from "./injectScript";
import { MonitorReport, SendReporter, bundleMonitor } from "./monitor";
import Deferred from "./util/Deferred";
import { defaultAnalysisTimeoutMs } from "./defaults";

export interface Options {
  isTopNavigationRequest: (req: CompletedRequest) => boolean;
  transform?: Transformer;
  httpForwardHost?: string;
  httpsForwardHost?: string;
}

export type Transformer = (
  content: string,
  contentType: TransformerContentType
) => Promise<string>;

export type TransformerContentType = "html" | "javascript";

export default class MonitorProxy {
  constructor(
    readonly mockttpServer: MockttpServer,
    readonly willCompleteAnalysis: Deferred<ExecutionDetail>
  ) {}

  getPort(): number {
    return this.mockttpServer.port;
  }

  waitForCompleteAnalysis(): Promise<ExecutionDetail> {
    return this.willCompleteAnalysis.promise;
  }

  async terminate(): Promise<void> {
    await this.mockttpServer.stop();
  }

  static async create(
    server: MockttpServer,
    options: Options
  ): Promise<MonitorProxy> {
    const monitorProxy = await configureServer(server, options);

    await server.start();

    return monitorProxy;
  }
}

const configureServer = async (
  server: MockttpServer,
  options: Options
): Promise<MonitorProxy> => {
  const {
    isTopNavigationRequest,
    transform,
    httpForwardHost,
    httpsForwardHost,
  } = options;

  const willCompleteAnalysis = new Deferred<ExecutionDetail>();

  const getMonitorUrl = `/${randomUUID()}`;
  const reportUrl = `/${randomUUID()}`;

  const injectMonitor: Transformer = async (
    content: string,
    contentType: TransformerContentType
  ): Promise<string> => {
    if (contentType === "html") {
      return injectScript(content, getMonitorUrl);
    }
    return content;
  };

  const compositeTransform: Transformer = transform
    ? async (content, contentType) =>
        await transform(await injectMonitor(content, contentType), contentType)
    : injectMonitor;

  const targetSites = new Set<string>();
  const includedScriptUrls = new Set<string>();
  const startTime: number = +new Date();

  const requestUrls = new Map<string, string>();
  const handlerOptions: PassThroughHandlerOptions = {
    async beforeRequest(req) {
      const getEffectiveUrl = (actualUrl: URL, host: string) => {
        const url = new URL(actualUrl);
        const colonIndex = host.indexOf(":");
        if (colonIndex === -1) {
          url.hostname = host;
          url.port = "";
        } else {
          url.hostname = host.substring(0, colonIndex);
          url.port = host.substring(colonIndex + 1);
        }
        return url;
      };

      const { id: requestId, url, headers } = req;
      const { hostname, href: effectiveUrl } = getEffectiveUrl(
        new URL(url),
        headers["host"]!
      );

      requestUrls.set(requestId, effectiveUrl);

      targetSites.add(hostname);

      try {
        await dnsLookup(hostname);
      } catch (e) {
        if (isTopNavigationRequest(req)) {
          willCompleteAnalysis.reject(e);
        }
        return {
          response: {
            statusCode: 599,
            body: (e as Error).message,
          },
        };
      }
    },

    async beforeResponse(res) {
      const { id: requestId, statusCode, statusMessage, headers, body } = res;

      const contentTypeHeader = headers["content-type"];
      let contentType: TransformerContentType;
      if (contentTypeHeader?.includes("html")) {
        contentType = "html";
      } else if (contentTypeHeader?.includes("javascript")) {
        contentType = "javascript";
      } else {
        return;
      }

      if (contentType === "javascript") {
        const url = requestUrls.get(requestId);
        if (url) {
          includedScriptUrls.add(url);
        }
      }

      const originalBody = await body.getText();
      if (!originalBody) {
        return;
      }

      const transformedBody = await compositeTransform(
        originalBody,
        contentType
      );
      return {
        statusCode,
        statusMessage,
        headers: {
          ...headers,
          "content-length": undefined,
        },
        body: transformedBody,
      };
    },
  };

  server
    .forAnyRequest()
    .withProtocol("http")
    .thenPassThrough({
      ...handlerOptions,
      ...(httpForwardHost
        ? {
            forwarding: {
              targetHost: httpForwardHost,
              updateHostHeader: false,
            },
          }
        : {}),
    });

  server
    .forAnyRequest()
    .withProtocol("https")
    .thenPassThrough({
      ...handlerOptions,
      ...(httpsForwardHost
        ? {
            forwarding: {
              targetHost: httpsForwardHost,
              updateHostHeader: false,
            },
          }
        : {}),
    });

  const monitor = await bundleMonitor({
    reporter: <SendReporter>{
      type: "SendReporter",
      url: reportUrl,
    },
    loadingTimeoutMs: defaultAnalysisTimeoutMs,
  });
  server.forGet(getMonitorUrl).thenReply(200, monitor);

  server.forPost(reportUrl).thenCallback(async (req) => {
    const executionTimeMs = +new Date() - startTime;

    const { body } = req;

    const monitorReport = (await body.getJson()) as MonitorReport;
    const {
      pageUrl,
      uncaughtErrors,
      consoleMessages,
      calledBuiltinMethods,
      cookieKeys,
      localStorageKeys,
      sessionStorageKeys,
      loadingCompleted,
    } = monitorReport;
    willCompleteAnalysis.resolve({
      pageUrl,
      featureSet: new FeatureSet(
        new Set(uncaughtErrors),
        new Set(consoleMessages),
        new Set(calledBuiltinMethods),
        new Set(cookieKeys),
        new Set(localStorageKeys),
        new Set(sessionStorageKeys),
        new Set(targetSites),
        new Set(includedScriptUrls)
      ),
      loadingCompleted,
      executionTimeMs,
    });

    return { statusCode: 204 };
  });

  return new MonitorProxy(server, willCompleteAnalysis);
};

export const useMonitorProxy = async <T>(
  mockttpServer: MockttpServer,
  options: Options,
  cb: (monitorProxy: MonitorProxy) => Promise<T>
): Promise<T> => {
  const monitorProxy = await MonitorProxy.create(mockttpServer, options);
  try {
    return await cb(monitorProxy);
  } finally {
    await monitorProxy.terminate();
  }
};
