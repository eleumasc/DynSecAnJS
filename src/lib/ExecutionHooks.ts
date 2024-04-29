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
import { scriptInlining } from "../tools/scriptInlining";

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
  (transformProvider: TransformProvider): ExecutionHooksProvider =>
  (compatMode) => {
    const transform = transformProvider(compatMode);

    const deferredCompleteAnalysis = new Deferred<ExecutionDetailCompleter>();

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
          targetSites: [],
          includedScriptUrls: [],
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
      },

      responseTransformer: async (res) => {
        const { body, req } = res;
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

export type TransformProvider = (
  compatMode: boolean
) => BodyTransformer | undefined;

export const identityTransformProvider = (): TransformProvider => {
  return () => undefined;
};

export const defaultTransformProvider =
  (directTransform?: BodyTransformer): TransformProvider =>
  (compatMode) => {
    const directTransformWithName =
      directTransform && bodyTransformerWithName("Tool", directTransform);
    return compatMode
      ? composeBodyTransformers(
          bodyTransformerWithName("Babel", transpileWithBabel()),
          directTransformWithName
        )
      : directTransformWithName;
  };

export const scriptInliningTransformProvider =
  (directTransform?: BodyTransformer): TransformProvider =>
  (compatMode) => {
    const scriptInliningStage = bodyTransformerWithName(
      "ScriptInlining",
      scriptInlining()
    );
    const directTransformWithName =
      directTransform && bodyTransformerWithName("Tool", directTransform);
    return compatMode
      ? composeBodyTransformers(
          scriptInliningStage,
          composeBodyTransformers(
            bodyTransformerWithName("Babel", transpileWithBabel()),
            directTransformWithName
          )
        )
      : composeBodyTransformers(scriptInliningStage, directTransformWithName);
  };
