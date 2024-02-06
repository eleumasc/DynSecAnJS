import { randomUUID } from "crypto";
import { lookup as dnsLookup } from "dns/promises";
import { CompletedRequest, Mockttp as MockttpServer } from "mockttp";
import { AnalysisResult, SuccessAnalysisResult } from "./AnalysisResult";
import FeatureSet from "./FeatureSet";
import { MonitorReport, SendReporter, bundleMonitor } from "./monitor";
import Deferred from "./util/Deferred";
import { injectScript } from "./injectScript";
import { PassThroughHandlerOptions } from "mockttp/dist/rules/requests/request-handler-definitions";

export interface AnalysisProxyOptions {
  isTopNavigationRequest: (req: CompletedRequest) => boolean;
  transform: Transformer;
  httpForwardHost?: string;
  httpsForwardHost?: string;
}

export type Transformer = (
  content: string,
  contentType: TransformerContentType
) => Promise<string>;

export type TransformerContentType = "html" | "javascript";

export default class AnalysisProxy {
  constructor(
    readonly server: MockttpServer,
    readonly willCompleteAnalysis: Deferred<AnalysisResult>
  ) {}

  getPort(): number {
    return this.server.port;
  }

  waitForCompleteAnalysis(): Promise<AnalysisResult> {
    return this.willCompleteAnalysis.promise;
  }

  async terminate(): Promise<void> {
    await this.server.stop();
  }

  static async create(
    server: MockttpServer,
    options: AnalysisProxyOptions
  ): Promise<AnalysisProxy> {
    const willCompleteAnalysis = await configureServer(server, options);

    await server.start();

    return new AnalysisProxy(server, willCompleteAnalysis);
  }
}

const configureServer = async (
  server: MockttpServer,
  options: AnalysisProxyOptions
): Promise<Deferred<AnalysisResult>> => {
  const {
    isTopNavigationRequest,
    transform,
    httpForwardHost,
    httpsForwardHost,
  } = options;

  const willCompleteAnalysis = new Deferred<AnalysisResult>();

  const getMonitorUrl = `/${randomUUID()}`;
  const reportUrl = `/${randomUUID()}`;

  const inlineMonitor = async (
    content: string,
    contentType: TransformerContentType
  ): Promise<string> => {
    if (contentType === "html") {
      return injectScript(content, getMonitorUrl);
    }
    return content;
  };

  const compositeTransform: Transformer = async (content, contentType) =>
    await transform(await inlineMonitor(content, contentType), contentType);

  const targetSites = new Set<string>();
  const includedScriptUrls = new Set<string>();

  const requestUrls = new Map<string, string>();
  const defaultPassThroughHandlerOptions: PassThroughHandlerOptions = {
    async beforeRequest(req) {
      const fixUrl = (url: URL, host: string) => {
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

      const { id: requestId, url: rawUrl, headers } = req;
      const { hostname, href: url } = fixUrl(new URL(rawUrl), headers["host"]!);

      requestUrls.set(requestId, url);

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
      ...defaultPassThroughHandlerOptions,
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
      ...defaultPassThroughHandlerOptions,
      ...(httpsForwardHost
        ? {
            forwarding: {
              targetHost: httpsForwardHost,
              updateHostHeader: false,
            },
          }
        : {}),
    });

  const monitor = await bundleMonitor(<SendReporter>{
    type: "SendReporter",
    url: reportUrl,
  });
  server.forGet(getMonitorUrl).thenReply(200, monitor);

  server.forPost(reportUrl).thenCallback(async (req) => {
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
    } = monitorReport;
    willCompleteAnalysis.resolve({
      status: "success",
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
    } satisfies SuccessAnalysisResult);

    return { statusCode: 204 };
  });

  return willCompleteAnalysis;
};

export const useAnalysisProxy = async <T>(
  server: MockttpServer,
  options: AnalysisProxyOptions,
  cb: (analysisProxy: AnalysisProxy) => Promise<T>
): Promise<T> => {
  const analysisProxy = await AnalysisProxy.create(server, options);
  try {
    return await cb(analysisProxy);
  } finally {
    await analysisProxy.terminate();
  }
};
