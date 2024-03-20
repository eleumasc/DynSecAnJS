import { Transformer } from "../PuppeteerAgent";

export const compose =
  (x: Transformer, y?: Transformer): Transformer =>
  async (content, contentType) => {
    const intermediateContent = await x(content, contentType);
    if (y) {
      return await y(intermediateContent, contentType);
    } else {
      return intermediateContent;
    }
  };
