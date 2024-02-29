import { ExecutionDetail } from "./ExecutionDetail";
import Deferred from "./util/Deferred";
import { MonitorReport } from "./monitor";
import { RequestListener, ResponseTransformer } from "./AnalysisProxy";
import FeatureSet from "./FeatureSet";
import { Transformer } from "./PuppeteerAgent";
import {
  CompatibilityDetail,
  ExternalScriptDetail,
  InlineScriptDetail,
  ScriptDetail,
} from "./compatibility/CompatibilityDetail";
import { extractInlineScripts } from "./compatibility/extractInlineScripts";
import { maxESVersion } from "./compatibility/ESVersion";
import { analyzeScript } from "./compatibility/analyzeScript";

export interface ProxyHooks {
  reportCallback: (data: any) => void;
  requestListener?: RequestListener;
  responseTransformer?: ResponseTransformer;
}

export type ProxyHooksProvider<T> = (
  willCompleteAnalysis: Deferred<T>
) => ProxyHooks;

export const createProxyHooksProviderForExecution =
  (transform?: Transformer): ProxyHooksProvider<ExecutionDetail> =>
  (willCompleteAnalysis) => {
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
        targetSites.add(req.url.hostname);
      },
      responseTransformer: async (res) => {
        const { contentType, body, req } = res;
        if (contentType === "javascript") {
          includedScriptUrls.add(req.url.href);
        }
        return transform ? transform(body, contentType) : body;
      },
    };
  };

export const createProxyHooksProviderForCompatibility =
  (): ProxyHooksProvider<CompatibilityDetail> => (willCompleteAnalysis) => {
    const scripts: ScriptDetail[] = [];
    return {
      reportCallback: (monitorReport: MonitorReport) => {
        const { pageUrl, loadingCompleted } = monitorReport;
        willCompleteAnalysis.resolve({
          pageUrl,
          minimumESVersion: maxESVersion(
            scripts.map(({ minimumESVersion }) => minimumESVersion)
          ),
          scripts,
        });
      },
      responseTransformer: async (res) => {
        const { body, contentType, req } = res;
        if (contentType === "html") {
          for (const { code, isEventHandler } of extractInlineScripts(body)) {
            const categories = analyzeScript(code, isEventHandler);
            scripts.push(<InlineScriptDetail>{
              kind: "inline",
              minimumESVersion: maxESVersion(
                categories.map(({ esVersion }) => esVersion)
              ),
              categories,
              isEventHandler,
            });
          }
        } else {
          const categories = analyzeScript(body);
          scripts.push(<ExternalScriptDetail>{
            kind: "external",
            minimumESVersion: maxESVersion(
              categories.map(({ esVersion }) => esVersion)
            ),
            categories,
            url: req.url.href,
          });
        }
        return body;
      },
    };
  };
