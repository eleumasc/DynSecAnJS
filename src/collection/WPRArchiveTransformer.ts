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
  checkScriptTransform: ResponseBodyTransformerHelper;
  tryScriptTransform: ResponseBodyTransformerHelper;
}

export type ResponseBodyTransformerHelper = (
  callback: (body: string) => Promise<string>
) => (body: string) => Promise<string>;

export const transformWPRArchive =
  (
    transformDocumentResponseBody: ResponseBodyTransformer,
    transformScriptResponseBody: ResponseBodyTransformer
  ): WPRArchiveTransformer =>
  async (oldWPRArchive, syntax) => {
    const { navUrl, scripts } = syntax;

    let newWPRArchive = oldWPRArchive;

    const scriptTransformErrorLogs: ScriptTransformErrorLog[] = [];
    const wrapTransformer =
      (
        transformer: ResponseBodyTransformer,
        scripts: SyntaxScript[]
      ): ResponseBodyTransformer =>
      async (body, context) => {
        const scriptIds = scripts.map((script) => script.id);
        const completion = await toCompletion(() => transformer(body, context));
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

    const checkScriptTransform: ResponseBodyTransformerHelper =
      (callback) => async (body) => {
        await callback(body);
        return body;
      };
    const tryScriptTransform: ResponseBodyTransformerHelper =
      (callback) => async (body) => {
        try {
          return await callback(body);
        } catch {
          return body;
        }
      };
    const contextBase = {
      oldWPRArchive,
      syntax,
      checkScriptTransform,
      tryScriptTransform,
    };

    const navRequest = oldWPRArchive.getRequest(navUrl);
    newWPRArchive = await editResponseBody(
      newWPRArchive,
      wrapTransformer(
        transformDocumentResponseBody,
        syntax.scripts.filter((script) => script.type === "inline")
      ),
      { ...contextBase, request: navRequest }
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
        wrapTransformer(transformScriptResponseBody, [script]),
        { ...contextBase, request: scriptRequest }
      );
    }

    return { newWPRArchive, scriptTransformErrorLogs };
  };

const editResponseBody = async (
  wprArchive: WPRArchive,
  transformResponseBody: ResponseBodyTransformer,
  context: ResponseBodyTransformerContext
): Promise<WPRArchive> => {
  const { request } = context;
  const originalBody = request.response.body.toString();
  const transformedBody = await transformResponseBody(originalBody, context);
  return wprArchive.editResponseBody(request, Buffer.from(transformedBody));
};
