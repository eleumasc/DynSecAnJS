import assert from "assert";
import HtmlDocument from "../htmlutil/HTMLDocument";
import { ElementHtmlScript } from "../htmlutil/HTMLScript";
import { Success, toCompletion } from "../util/Completion";
import {
  transformWPRArchive,
  WPRArchiveTransformer,
} from "./WPRArchiveTransformer";

export const inlineExternalScripts =
  (consolidate: boolean = false): WPRArchiveTransformer =>
  (originalWPRArchive, preanalyzeReport) => {
    const { scriptUrlMap } = preanalyzeReport;

    const transformHtml = async (htmlSource: string): Promise<string> => {
      const htmlDocument = HtmlDocument.parse(htmlSource);

      for (const htmlScript of htmlDocument.activeScripts) {
        if (!(htmlScript instanceof ElementHtmlScript)) continue;

        if (htmlScript.isExternal) {
          const scriptUrl = scriptUrlMap[htmlScript.src];
          assert(scriptUrl !== undefined);
          const scriptRequest = originalWPRArchive.tryGetRequest(scriptUrl);
          htmlScript.inlineSource =
            scriptRequest?.response.body.toString() ?? "";
        }
      }

      if (consolidate) {
        const normalScriptSources: string[] = [];
        const deferredScriptSources: string[] = [];

        for (const htmlScript of htmlDocument.activeScripts) {
          if (!(htmlScript instanceof ElementHtmlScript)) continue;
          assert(htmlScript.isInline);

          (htmlScript.isDefer
            ? deferredScriptSources
            : normalScriptSources
          ).push(htmlScript.inlineSource);

          htmlDocument.removeElementHtmlScript(htmlScript);
        }

        const initHtmlScript = htmlDocument.createInitHtmlScript();
        initHtmlScript.isDefer = true;
        initHtmlScript.inlineSource = [
          ...normalScriptSources,
          ...deferredScriptSources,
        ]
          .filter((source) => source.length > 0)
          .join("\n\n");
      }

      return htmlDocument.serialize();
    };

    return transformWPRArchive(
      (body) => toCompletion(() => transformHtml(body)),
      async (body) => Success(body)
    )(originalWPRArchive, preanalyzeReport);
  };
