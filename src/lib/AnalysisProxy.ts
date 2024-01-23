import crypto from "crypto";
import { lookup as dnsLookup } from "dns/promises";
import { CompletedRequest, Mockttp as MockttpServer } from "mockttp";
import { AnalysisResult, SuccessAnalysisResult } from "./Analysis";
import { DefaultFeatureSet } from "./DefaultFeatureSet";
import { MonitorReport, SendReporter, bundleMonitor } from "./monitor";
import Completer from "./util/Completer";

export interface AnalysisProxyOptions {
  isTopNavigationRequest: (req: CompletedRequest) => boolean;
  transform: Transformer;
}

export type Transformer = (
  content: string,
  contentType: TransformerContentType
) => Promise<string>;

export type TransformerContentType = "html" | "javascript";

export default class AnalysisProxy {
  constructor(
    readonly server: MockttpServer,
    readonly willCompleteAnalysis: Completer<AnalysisResult>
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
): Promise<Completer<AnalysisResult>> => {
  const { transform } = options;

  const getMonitorUrl = `/${crypto.randomUUID()}`;
  const reportUrl = `/${crypto.randomUUID()}`;

  const inlineMonitor = async (
    content: string,
    contentType: TransformerContentType
  ): Promise<string> => {
    if (contentType !== "html") {
      return content;
    }

    const index = content.indexOf("<script "); // TODO: improve
    if (index !== -1) {
      return (
        content.substring(0, index) +
        `<script src="${getMonitorUrl}"></script>` +
        content.substring(index)
      );
    }
    return content;
  };

  const compositeTransform: Transformer = async (content, contentType) =>
    await transform(await inlineMonitor(content, contentType), contentType);

  const targetSites = new Set<string>();
  server.forAnyRequest().thenPassThrough({
    async beforeRequest(req) {
      const { url } = req;
      const { hostname } = new URL(url);

      targetSites.add(hostname);

      try {
        await dnsLookup(hostname);
      } catch (e) {
        // TODO: failure if request if TOP NAVIGATION request (options.isTopNavigationRequest)
        return {
          response: {
            statusCode: 599,
            body: (e as Error).message,
          },
        };
      }
    },

    async beforeResponse(res) {
      const { statusCode, statusMessage, headers, body } = res;

      const contentTypeHeader = headers["content-type"];
      let contentType: TransformerContentType;
      if (contentTypeHeader?.includes("html")) {
        contentType = "html";
      } else if (contentTypeHeader?.includes("javascript")) {
        contentType = "javascript";
      } else {
        return;
      }

      const originalBodyText = await body.getText();
      if (!originalBodyText) {
        return;
      }

      const transformedBodyText = await compositeTransform(
        originalBodyText,
        contentType
      );
      return {
        statusCode,
        statusMessage,
        headers: {
          ...headers,
          "content-length": undefined,
        },
        body: transformedBodyText,
      };
    },
  });

  const monitor = await bundleMonitor(<SendReporter>{
    type: "SendReporter",
    url: reportUrl,
  });
  server.forGet(getMonitorUrl).thenReply(200, monitor);

  const willCompleteAnalysis = new Completer<AnalysisResult>();
  server.forPost(reportUrl).thenCallback(async (req) => {
    const { body } = req;

    const monitorReport = (await body.getJson()) as MonitorReport;
    const {
      pageUrl,
      uncaughtErrors,
      consoleMessages,
      calledNativeMethods,
      cookieKeys,
      localStorageKeys,
      sessionStorageKeys,
    } = monitorReport;
    willCompleteAnalysis.complete({
      status: "success",
      pageUrl,
      featureSet: new DefaultFeatureSet(
        new Set(uncaughtErrors),
        new Set(consoleMessages),
        new Set(calledNativeMethods),
        new Set(cookieKeys),
        new Set(localStorageKeys),
        new Set(sessionStorageKeys),
        new Set(targetSites)
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
