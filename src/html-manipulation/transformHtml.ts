import * as parse5 from "parse5";

import { HtmlTransformer } from "./HtmlTransformer";

export const transformHtml = async (
  html: string,
  transformer: HtmlTransformer
) => {
  const document = parse5.parse(html);
  await transformer(document);
  return parse5.serialize(document);
};

export const composeHtmlTransformers =
  (transformers: HtmlTransformer[]): HtmlTransformer =>
  async (document) => {
    for (const transformer of transformers) {
      await transformer(document);
    }
  };
