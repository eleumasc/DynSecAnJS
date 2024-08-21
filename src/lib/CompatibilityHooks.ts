import { ProxiedMonitorHooks } from "./ProxiedMonitorHooks";
import { SiteSyntax } from "../compatibility/SiteSyntax";

export interface CompatibilityHooks {
  hooks: ProxiedMonitorHooks;
  willCompleteAnalysis: () => Promise<SiteSyntax>;
}

export type CompatibilityHooksProvider = () => CompatibilityHooks;

export const createCompatibilityHooksProvider =
  (): CompatibilityHooksProvider => () => {
    throw new Error("Not implemented");

    // const deferredCompleteAnalysis = new Deferred<SiteSyntax>();

    // const scripts: BaseScriptSyntax[] = [];

    // const hooks = <ProxiedMonitorHooks>{
    //   reportCallback: (report) => {
    //     const { pageUrl } = report;
    //     deferredCompleteAnalysis.resolve({
    //       documentUrl: pageUrl,
    //       minimumESVersion: maxESVersion(
    //         scripts.map(({ minimumESVersion }) => minimumESVersion)
    //       ),
    //       scripts,
    //     });
    //   },

    //   responseTransformer: async (res) => {
    //     const tryAnalyzeScript = (
    //       callback: (
    //         categories: SyntaxCategory[],
    //         minimumESVersion: ESVersion
    //       ) => void,
    //       code: string,
    //       isEventHandler: boolean = false
    //     ) => {
    //       try {
    //         const categories = getSiteSyntax(code, isEventHandler);
    //         const minimumESVersion = maxESVersion(
    //           categories.map(({ esVersion }) => esVersion)
    //         );
    //         callback(categories, minimumESVersion);
    //       } catch (e) {
    //         console.log(req.url.href, e);
    //       }
    //     };

    //     const { body, contentType, req } = res;
    //     if (contentType === "html") {
    //       for (const { code, isEventHandler } of extractInlineScripts(body)) {
    //         tryAnalyzeScript(
    //           (categories, minimumESVersion) => {
    //             scripts.push(<InlineSyntaxScript>{
    //               type: "inline",
    //               minimumESVersion,
    //               categories,
    //               isEventHandler,
    //             });
    //           },
    //           code,
    //           isEventHandler
    //         );
    //       }
    //     } else {
    //       tryAnalyzeScript((categories, minimumESVersion) => {
    //         scripts.push(<ExternalSyntaxScript>{
    //           type: "external",
    //           minimumESVersion: minimumESVersion,
    //           categories,
    //           url: req.url.href,
    //         });
    //       }, body);
    //     }
    //     return body;
    //   },

    //   dnsLookupErrorListener: (err) => {
    //     deferredCompleteAnalysis.reject(err);
    //   },
    // };

    // return {
    //   hooks,
    //   willCompleteAnalysis: () => deferredCompleteAnalysis.promise,
    // };
  };
