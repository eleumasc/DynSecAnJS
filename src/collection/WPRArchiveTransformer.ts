import _ from "lodash";
import ArchivedRequest from "../wprarchive/ArchivedRequest";
import WPRArchive from "../wprarchive/WPRArchive";
import { Failure, isSuccess, toCompletion } from "../util/Completion";
import { Syntax, SyntaxScript } from "../syntax/Syntax";

export type WPRArchiveTransformer = (
  oldWPRArchive: WPRArchive,
  syntax: Syntax
) => Promise<TransformWPRArchiveResult>;

export type TransformWPRArchiveResult = {
  newWPRArchive: WPRArchive;
  scriptTransformErrorLogs: ScriptTransformErrorLog[];
};

export type ScriptTransformErrorLog = {
  scriptIds: number[];
  error: Failure["error"];
};

export type ResponseBodyTransformer = (
  body: string,
  context: ResponseBodyTransformerContext
) => Promise<string>;

export interface ResponseBodyTransformerContext {
  request: ArchivedRequest;
  oldWPRArchive: WPRArchive;
  syntax: Syntax;
  wrapScriptTransform: (
    callback: (body: string) => Promise<string>,
    scripts?: SyntaxScript[]
  ) => (script: string) => Promise<string>;
}

export const transformWPRArchive =
  (
    transformDocumentResponseBody: ResponseBodyTransformer,
    transformScriptResponseBody: ResponseBodyTransformer
  ): WPRArchiveTransformer =>
  async (oldWPRArchive, syntax) => {
    const { navUrl, scripts } = syntax;

    let newWPRArchive = oldWPRArchive;

    const scriptTransformErrorLogs: ScriptTransformErrorLog[] = [];
    const createWrapScriptTransform =
      (
        defaultScripts: SyntaxScript[]
      ): ResponseBodyTransformerContext["wrapScriptTransform"] =>
      (callback, scripts) =>
      async (body) => {
        const scriptIds = (scripts ?? defaultScripts).map(
          (script) => script.id
        );
        const completion = await toCompletion(() => callback(body));
        if (isSuccess(completion)) {
          return completion.value;
        } else {
          scriptTransformErrorLogs.push({
            scriptIds,
            error: completion.error,
          });
          return body;
        }
      };

    const navRequest = oldWPRArchive.getRequest(navUrl);
    newWPRArchive = await editResponseBody(
      newWPRArchive,
      transformDocumentResponseBody,
      {
        request: navRequest,
        oldWPRArchive,
        syntax,
        wrapScriptTransform: createWrapScriptTransform(
          syntax.scripts.filter((script) => script.type === "inline")
        ),
      }
    );

    const editedScriptRequests = new Set<ArchivedRequest>();
    for (const script of scripts.filter(
      (script): script is typeof script & { type: "external" } =>
        script.type === "external"
    )) {
      const scriptRequest = oldWPRArchive.tryGetRequest(script.url);
      if (!scriptRequest) continue;

      if (editedScriptRequests.has(scriptRequest)) continue;
      editedScriptRequests.add(scriptRequest);

      newWPRArchive = await editResponseBody(
        newWPRArchive,
        transformScriptResponseBody,
        {
          request: scriptRequest,
          oldWPRArchive,
          syntax,
          wrapScriptTransform: createWrapScriptTransform([script]),
        }
      );
    }

    return {
      newWPRArchive,
      scriptTransformErrorLogs: scriptTransformErrorLogs,
    };
  };

const editResponseBody = async (
  wprArchive: WPRArchive,
  transformResponseBody: ResponseBodyTransformer,
  context: ResponseBodyTransformerContext
): Promise<WPRArchive> => {
  const { request, wrapScriptTransform } = context;
  const originalBody = request.response.body.toString();
  const transformedBody = await wrapScriptTransform((body) =>
    transformResponseBody(body, context)
  )(originalBody);
  return wprArchive.editResponseBody(request, Buffer.from(transformedBody));
};
