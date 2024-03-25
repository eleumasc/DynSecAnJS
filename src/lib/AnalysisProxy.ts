import { randomUUID } from "crypto";
import { lookup as dnsLookup } from "dns/promises";
import { Headers, Mockttp as MockttpServer } from "mockttp";
import { PassThroughHandlerOptions } from "mockttp/dist/rules/requests/request-handler-definitions";
import { injectScripts } from "../html-manipulation/injectScripts";
import { transformHtml } from "../html-manipulation/transformHtml";

export type ContentType = "html" | "javascript";

export interface Request {
  method: string;
  url: URL;
  headers: Headers;
}

export type RequestListener = (req: Request) => void;

export interface Response {
  statusCode: number;
  statusMessage: string | undefined;
  headers: Headers;
  body: string;
  contentType: ContentType;
  req: Request;
}

export type ResponseTransformer = (res: Response) => Promise<string>;

export type DnsLookupErrorListener = (err: Error, req: Request) => void;

export interface ExposedCallback {
  callback: (data: any) => void;
  url: string;
}

export interface InitScript {
  code: string;
  url: string;
}

const generateUrl = () => `/${randomUUID()}`;

export const createExposedCallback = (
  callback: (data: any) => void
): ExposedCallback => {
  const url = generateUrl();
  return { callback, url };
};

export const createInitScript = (code: string): InitScript => {
  const url = generateUrl();
  return { code, url };
};

export interface ConfigurerOptions {
  exposedCallbacks?: ExposedCallback[];
  initScripts?: InitScript[];
  requestListener?: RequestListener;
  responseTransformer?: ResponseTransformer;
  dnsLookupErrorListener?: DnsLookupErrorListener;
  httpForwardHost?: string;
  httpsForwardHost?: string;
}

const configure = async (
  mockttpServer: MockttpServer,
  configurerOptions: ConfigurerOptions
): Promise<void> => {
  const {
    exposedCallbacks,
    initScripts,
    requestListener,
    responseTransformer,
    dnsLookupErrorListener,
    httpForwardHost,
    httpsForwardHost,
  } = configurerOptions;

  const getCookedUrl = (rawUrl: string, host: string): URL => {
    const url = new URL(rawUrl);
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

  const requests = new Map<string, Request>();
  const handlerOptions: PassThroughHandlerOptions = {
    async beforeRequest(mockttpReq) {
      const { id: requestId, method, url, headers } = mockttpReq;
      const cookedUrl = getCookedUrl(url, headers["host"]!);
      const req = <Request>{
        method,
        url: cookedUrl,
        headers,
      };
      requests.set(requestId, req);

      if (requestListener) {
        requestListener(req);
      }

      try {
        await dnsLookup(cookedUrl.hostname);
      } catch (e) {
        if (dnsLookupErrorListener) {
          dnsLookupErrorListener(e as Error, req);
        }
        return {
          response: {
            statusCode: 599,
            body: (e as Error).message,
          },
        };
      }
    },

    async beforeResponse(mockttpRes) {
      const {
        id: requestId,
        statusCode,
        statusMessage,
        headers,
        body,
      } = mockttpRes;

      if (statusCode >= 300 && statusCode <= 399) {
        return;
      }

      const ctHeader = headers["content-type"];
      const ctHeaderIncludes = (searchString: string): boolean =>
        !!ctHeader && ctHeader.toString().includes(searchString);
      let contentType: ContentType;
      if (ctHeaderIncludes("html")) {
        contentType = "html";
      } else if (ctHeaderIncludes("javascript")) {
        contentType = "javascript";
      } else {
        return;
      }

      let bodyText = await body.getText();
      if (!bodyText) {
        return;
      }

      if (responseTransformer) {
        const res = <Response>{
          statusCode,
          statusMessage,
          headers,
          body: bodyText,
          contentType,
          req: requests.get(requestId)!,
        };
        bodyText = await responseTransformer(res);
      }

      if (initScripts && contentType === "html") {
        bodyText = await transformHtml(
          bodyText,
          injectScripts(initScripts.map(({ url }) => url))
        );
      }

      return {
        statusCode,
        statusMessage,
        headers: {
          ...headers,
          "content-length": undefined,
          "content-security-policy": undefined,
        },
        body: bodyText,
      };
    },
  };

  mockttpServer
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

  mockttpServer
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

  for (const { callback, url } of exposedCallbacks ?? []) {
    mockttpServer.forPost(url).thenCallback(async (req) => {
      const { body } = req;
      const data = await body.getJson();
      callback(data);
      return { statusCode: 204 };
    });
  }

  for (const { code, url } of initScripts ?? []) {
    mockttpServer.forGet(url).thenReply(200, code);
  }
};

export default class AnalysisProxy {
  constructor(readonly mockttpServer: MockttpServer) {}

  getPort(): number {
    return this.mockttpServer.port;
  }

  async terminate(): Promise<void> {
    await this.mockttpServer.stop();
  }

  static async create(
    mockttpServer: MockttpServer,
    configurerOptions: ConfigurerOptions
  ): Promise<AnalysisProxy> {
    await configure(mockttpServer, configurerOptions);
    await mockttpServer.start();
    return new AnalysisProxy(mockttpServer);
  }
}

export const useAnalysisProxy = async <T>(
  mockttpServer: MockttpServer,
  configurerOptions: ConfigurerOptions,
  cb: (analysisProxy: AnalysisProxy) => Promise<T>
): Promise<T> => {
  const analysisProxy = await AnalysisProxy.create(
    mockttpServer,
    configurerOptions
  );
  try {
    return await cb(analysisProxy);
  } finally {
    await analysisProxy.terminate();
  }
};
