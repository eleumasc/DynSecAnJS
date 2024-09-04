import _ from "lodash";
import ArchivedRequest from "../wprarchive/ArchivedRequest";
import WPRArchive from "../wprarchive/WPRArchive";
import { PreanalyzeReport } from "../archive/PreanalyzeArchive";

export type WPRArchiveTransformer = (
  originalWPRArchive: WPRArchive,
  preanalyzeReport: PreanalyzeReport
) => Promise<TransformWPRArchiveResult>;

export type TransformWPRArchiveResult =
  | { status: "success"; transformedWPRArchive: WPRArchive }
  | { status: "failure"; transformErrors: string[] };

export type ResponseBodyTransformer = (
  body: string,
  request: ArchivedRequest,
  originalWPRArchive: WPRArchive,
  preanalyzeReport: PreanalyzeReport
) => Promise<string>;

export const transformWPRArchive =
  (
    transformMainResponseBody: ResponseBodyTransformer,
    transformScriptResponseBody: ResponseBodyTransformer
  ): WPRArchiveTransformer =>
  async (originalWPRArchive, preanalyzeReport) => {
    const transformErrorsArray: string[] = [];
    const editResponseBody = async (
      wprArchive: WPRArchive,
      request: ArchivedRequest,
      transformResponseBody: ResponseBodyTransformer
    ): Promise<WPRArchive> => {
      try {
        const originalBody = request.response.body.toString();
        const transformedBody = await transformResponseBody(
          originalBody,
          request,
          originalWPRArchive,
          preanalyzeReport
        );
        return wprArchive.editResponseBody(
          request,
          Buffer.from(transformedBody)
        );
      } catch (e) {
        transformErrorsArray.push(String(e));
        return wprArchive;
      }
    };

    const { mainUrl, scripts } = preanalyzeReport;

    let transformedWPRArchive = originalWPRArchive;

    const mainRequest = originalWPRArchive.getRequest(mainUrl);
    transformedWPRArchive = await editResponseBody(
      transformedWPRArchive,
      mainRequest,
      transformMainResponseBody
    );

    const transformedScriptRequests = new Set<ArchivedRequest>();
    const scriptUrls = _.uniq(
      scripts.flatMap((script): string[] =>
        script.type === "external"
          ? [
              script.url,
              ...(script.isModule ? Object.values(script.importUrlMap) : []),
            ]
          : []
      )
    );
    for (const scriptUrl of scriptUrls) {
      const scriptRequest = originalWPRArchive.tryGetRequest(scriptUrl);
      if (!scriptRequest) continue;

      if (transformedScriptRequests.has(scriptRequest)) continue;
      transformedScriptRequests.add(scriptRequest);

      transformedWPRArchive = await editResponseBody(
        transformedWPRArchive,
        scriptRequest,
        transformScriptResponseBody
      );
    }

    if (transformErrorsArray.length > 0) {
      return { status: "failure", transformErrors: transformErrorsArray };
    }

    return { status: "success", transformedWPRArchive };
  };
