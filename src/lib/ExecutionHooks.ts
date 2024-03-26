import { ExecutionDetail } from "./ExecutionDetail";
import { transpileWithBabel } from "../tools/babel";
import { composeBodyTransformers } from "../tools/util";
import { Response } from "./AnalysisProxy";
import Deferred from "../core/Deferred";
import { ProxiedMonitorHooks } from "./ProxiedMonitorHooks";

export type BodyTransformer = (
  content: string,
  res: Response
) => Promise<string>;

export type ExecutionHooksResult = Pick<
  ExecutionDetail,
  | "pageUrl"
  | "loadingCompleted"
  | "transformErrors"
  | "uncaughtErrors"
  | "consoleMessages"
  | "calledBuiltinMethods"
  | "cookieKeys"
  | "localStorageKeys"
  | "sessionStorageKeys"
  | "targetSites"
  | "includedScriptUrls"
>;

export type ExecutionHooksResultDelta = Omit<
  ExecutionDetail,
  keyof ExecutionHooksResult
>;

export type ExecutionDetailCompleter = (
  delta: ExecutionHooksResultDelta
) => ExecutionDetail;

export interface ExecutionHooks {
  hooks: ProxiedMonitorHooks;
  willCompleteAnalysis: Promise<ExecutionDetailCompleter>;
}

export type ExecutionHooksProvider = (compatMode: boolean) => ExecutionHooks;

export const createExecutionHooksProvider =
  (directTransform?: BodyTransformer): ExecutionHooksProvider =>
  (compatMode) => {
    const transform = compatMode
      ? composeBodyTransformers(transpileWithBabel, directTransform)
      : directTransform;

    const deferredCompleteAnalysis = new Deferred<ExecutionDetailCompleter>();

    const targetSites = new Set<string>();
    const includedScriptUrls = new Set<string>();
    const transformErrors: string[] = [];

    const hooks = <ProxiedMonitorHooks>{
      reportCallback: (report) => {
        const {
          pageUrl,
          uncaughtErrors,
          consoleMessages,
          calledBuiltinMethods,
          cookieKeys,
          localStorageKeys,
          sessionStorageKeys,
          loadingCompleted,
        } = report;
        deferredCompleteAnalysis.resolve((delta) => ({
          pageUrl,
          uncaughtErrors,
          consoleMessages,
          calledBuiltinMethods,
          cookieKeys,
          localStorageKeys,
          sessionStorageKeys,
          targetSites: [...targetSites],
          includedScriptUrls: [...includedScriptUrls],
          loadingCompleted,
          transformErrors: [...transformErrors],
          ...delta,
        }));
      },

      requestListener: (req) => {
        const { hostname } = req.url;
        if (hostname.endsWith(".services.mozilla.com")) {
          return;
        }
        targetSites.add(hostname);
      },

      responseTransformer: async (res) => {
        const { contentType, body, req } = res;
        if (contentType === "javascript") {
          includedScriptUrls.add(req.url.href);
        }
        if (transform) {
          try {
            return await transform(body, res);
          } catch (e) {
            transformErrors.push(`[${req.url}] ${e}`);
          }
        }
        return body;
      },

      dnsLookupErrorListener: (err) => {
        deferredCompleteAnalysis.reject(err);
      },
    };

    return {
      hooks,
      willCompleteAnalysis: deferredCompleteAnalysis.promise,
    };
  };
