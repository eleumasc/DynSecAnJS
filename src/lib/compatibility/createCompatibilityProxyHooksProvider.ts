import { MonitorReport } from "../monitor";
import {
  Category,
  CompatibilityDetail,
  ExternalScriptDetail,
  InlineScriptDetail,
  ScriptDetail,
} from "./CompatibilityDetail";
import { extractInlineScripts } from "./extractInlineScripts";
import { ESVersion, maxESVersion } from "./ESVersion";
import { analyzeScript } from "./analyzeScript";
import { ProxyHooksProvider } from "../ProxyHooks";

export const createCompatibilityProxyHooksProvider =
  (): ProxyHooksProvider<CompatibilityDetail> => (willCompleteAnalysis) => {
    const scripts: ScriptDetail[] = [];
    return {
      reportCallback: (monitorReport: MonitorReport) => {
        const { pageUrl } = monitorReport;
        willCompleteAnalysis.resolve({
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
    };
  };
