import { ExecutionDetail, TransformErrorDetail } from "./ExecutionDetail";
import { transpileWithBabel } from "../tools/babel";
import {
  composeBodyTransformers,
  bodyTransformerWithName,
} from "./BodyTransformer";
import Deferred from "../core/Deferred";
import { ProxiedMonitorHooks } from "./ProxiedMonitorHooks";
import { BodyTransformer } from "./BodyTransformer";
import { BodyTransformerError } from "./BodyTransformer";

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
  willCompleteAnalysis: () => Promise<ExecutionDetailCompleter>;
}

export type ExecutionHooksProvider = (compatMode: boolean) => ExecutionHooks;

export const createExecutionHooksProvider =
  (directTransform?: BodyTransformer): ExecutionHooksProvider =>
  (compatMode) => {
    const directTransformWithName =
      directTransform && bodyTransformerWithName("Tool", directTransform);
    const transform = compatMode
      ? composeBodyTransformers(
          bodyTransformerWithName("Babel", transpileWithBabel()),
          directTransformWithName
        )
      : directTransformWithName;

    const deferredCompleteAnalysis = new Deferred<ExecutionDetailCompleter>();

    const targetSites = new Set<string>();
    const includedScriptUrls = new Set<string>();
    const transformErrors: TransformErrorDetail[] = [];

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
            transformErrors.push({
              transformName:
                e instanceof BodyTransformerError ? e.transformName : undefined,
              url: req.url.href,
              message: String(e),
            });
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
      willCompleteAnalysis: () => deferredCompleteAnalysis.promise,
    };
  };
