import { Transformer } from "../PuppeteerAgent";

export const identifyTransformer = (
  name: string,
  transformer: Transformer
): Transformer => {
  return async (content, contentType) => {
    try {
      return await transformer(content, contentType);
    } catch (e) {
      throw `${name}: ${e}`;
    }
  };
};
