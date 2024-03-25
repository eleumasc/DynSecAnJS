import { ExecutionDetail } from "./ExecutionDetail";
import { MonitorReport } from "./monitor";
import FeatureSet from "./FeatureSet";
import { ResponseTransformer } from "./ResponseTransformer";
import { ProxyHooksProvider } from "./ProxyHooks";
import { transpileWithBabel } from "../tool/babel";
import { composeResponseTransformers } from "../tool/util";

export const createExecutionProxyHooksProvider =
  (
    directTransform?: ResponseTransformer
  ): ProxyHooksProvider<ExecutionDetail> =>
  (willCompleteAnalysis, compatMode) => {
    let eventuallyCompatible: boolean = true;
    const transformLogs: string[] = [];
    const targetSites = new Set<string>();
    const includedScriptUrls = new Set<string>();
    const startTime = Date.now();
    return {
      reportCallback: (monitorReport: MonitorReport) => {
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
          eventuallyCompatible,
          transformLogs,
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
          executionTimeMs: Date.now() - startTime,
        });
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
        const transform = compatMode
          ? composeResponseTransformers(transpileWithBabel, directTransform)
          : directTransform;
        if (transform) {
          try {
            return await transform(body, res);
          } catch (e) {
            eventuallyCompatible = false;
            transformLogs.push(`[${req.url}] ${e}`);
          }
        }
        return body;
      },
    };
  };
