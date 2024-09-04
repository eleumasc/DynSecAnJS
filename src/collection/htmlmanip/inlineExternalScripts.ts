import assert from "assert";
import WPRArchive from "../../wprarchive/WPRArchive";
import { ElementHTMLScript } from "../../htmlutil/HTMLScript";
import { HTMLManipulator } from "./HTMLManipulator";
import { PreanalyzeReport } from "../../archive/PreanalyzeArchive";

export const inlineExternalScripts =
  (
    originalWPRArchive: WPRArchive,
    preanalyzeReport: PreanalyzeReport,
    consolidate: boolean = false
  ): HTMLManipulator =>
  async (htmlDocument) => {
    const { scriptUrlMap } = preanalyzeReport;

    for (const htmlScript of htmlDocument.activeScripts) {
      if (!(htmlScript instanceof ElementHTMLScript)) continue;

      if (htmlScript.isExternal) {
        const scriptUrl = scriptUrlMap[htmlScript.src];
        assert(scriptUrl !== undefined);
        const scriptRequest = originalWPRArchive.tryGetRequest(scriptUrl);
        htmlScript.inlineSource = scriptRequest?.response.body.toString() ?? "";
      }
    }

    if (consolidate) {
      const normalScriptSources: string[] = [];
      const deferredScriptSources: string[] = [];

      for (const htmlScript of htmlDocument.activeScripts) {
        if (!(htmlScript instanceof ElementHTMLScript)) continue;
        assert(htmlScript.isInline);

        (htmlScript.isDefer ? deferredScriptSources : normalScriptSources).push(
          htmlScript.inlineSource
        );

        htmlDocument.removeElementScript(htmlScript);
      }

      const initHtmlScript = htmlDocument.createInitScript();
      initHtmlScript.isDefer = true;
      initHtmlScript.inlineSource = [
        ...normalScriptSources,
        ...deferredScriptSources,
      ]
        .filter((source) => source.length > 0)
        .join("\n\n");
    }
  };
