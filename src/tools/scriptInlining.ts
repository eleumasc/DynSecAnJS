import { BodyTransformer } from "../lib/BodyTransformer";
import { inlineExternalScripts } from "../html/inlineExternalScripts";
import { transformHtml } from "../html/transformHtml";

export const scriptInlining =
  (): BodyTransformer =>
  async (content, { contentType, req }) => {
    switch (contentType) {
      case "html":
        return await transformHtml(content, inlineExternalScripts(req.url));
      case "javascript":
        return content;
    }
  };
