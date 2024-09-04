import _ from "lodash";
import ArchivedRequest from "../wprarchive/ArchivedRequest";
import WPRArchive from "../wprarchive/WPRArchive";
import { Completion, isSuccess } from "../util/Completion";
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
  request: ArchivedRequest
) => Promise<Completion<string>>;

export const transformWPRArchive =
  (
    transformMainResponseBody: ResponseBodyTransformer,
    transformScriptResponseBody: ResponseBodyTransformer
  ): WPRArchiveTransformer =>
  async (originalWPRArchive, preanalyzeReport) => {
    const transformErrors: string[] = [];
    const editResponseBody = createEditResponseBody(transformErrors);

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

    if (transformErrors.length > 0) {
      return { status: "failure", transformErrors };
    }

    return { status: "success", transformedWPRArchive };
  };

const createEditResponseBody =
  (transformErrorsArray: string[]) =>
  async (
    wprArchive: WPRArchive,
    request: ArchivedRequest,
    transformResponseBody: ResponseBodyTransformer
  ): Promise<WPRArchive> => {
    const completion = await transformResponseBody(
      request.response.body.toString(),
      request
    );

    if (isSuccess(completion)) {
      return wprArchive.editResponseBody(
        request,
        Buffer.from(completion.value)
      );
    } else {
      transformErrorsArray.push(completion.error);
      return wprArchive;
    }
  };

export const composeWPRArchiveTransformers =
  (a: WPRArchiveTransformer, b: WPRArchiveTransformer): WPRArchiveTransformer =>
  async (originalWPRArchive, preanalyzeReport) => {
    const transformResult = await a(originalWPRArchive, preanalyzeReport);
    if (transformResult.status === "failure") {
      return transformResult;
    }
    return await b(transformResult.transformedWPRArchive, preanalyzeReport);
  };
