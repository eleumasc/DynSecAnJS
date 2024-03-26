import {
  Category,
  CompatibilityDetail,
  ExternalScriptDetail,
  InlineScriptDetail,
  ScriptDetail,
} from "../compatibility/CompatibilityDetail";
import { extractInlineScripts } from "../html/extractInlineScripts";
import { ESVersion, maxESVersion } from "../compatibility/ESVersion";
import { analyzeScript } from "../compatibility/analyzeScript";
import { ProxiedMonitorHooks } from "./ProxiedMonitorHooks";
import Deferred from "../core/Deferred";

export interface CompatibilityHooks {
  hooks: ProxiedMonitorHooks;
  willCompleteAnalysis: Promise<CompatibilityDetail>;
}

export type CompatibilityHooksProvider = () => CompatibilityHooks;

export const createCompatibilityHooksProvider =
  (): CompatibilityHooksProvider => () => {
    const deferredCompleteAnalysis = new Deferred<CompatibilityDetail>();

    const scripts: ScriptDetail[] = [];

    const hooks = <ProxiedMonitorHooks>{
      reportCallback: (report) => {
        const { pageUrl } = report;
        deferredCompleteAnalysis.resolve({
          pageUrl,
          minimumESVersion: maxESVersion(
            scripts.map(({ minimumESVersion }) => minimumESVersion)
          ),
          scripts,
        });
      },

      responseTransformer: async (res) => {
        const tryAnalyzeScript = (
          callback: (
            categories: Category[],
            minimumESVersion: ESVersion
          ) => void,
          code: string,
          isEventHandler: boolean = false
        ) => {
          try {
            const categories = analyzeScript(code, isEventHandler);
            const minimumESVersion = maxESVersion(
              categories.map(({ esVersion }) => esVersion)
            );
            callback(categories, minimumESVersion);
          } catch (e) {
            console.log(req.url.href, e);
          }
        };

        const { body, contentType, req } = res;
        if (contentType === "html") {
          for (const { code, isEventHandler } of extractInlineScripts(body)) {
            tryAnalyzeScript(
              (categories, minimumESVersion) => {
                scripts.push(<InlineScriptDetail>{
                  kind: "inline",
                  minimumESVersion,
                  categories,
                  isEventHandler,
                });
              },
              code,
              isEventHandler
            );
          }
        } else {
          tryAnalyzeScript((categories, minimumESVersion) => {
            scripts.push(<ExternalScriptDetail>{
              kind: "external",
              minimumESVersion: minimumESVersion,
              categories,
              url: req.url.href,
            });
          }, body);
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
