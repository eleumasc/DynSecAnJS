import { ResponseTransformer } from "../ResponseTransformer";

export const composeResponseTransformers =
  (x: ResponseTransformer, y?: ResponseTransformer): ResponseTransformer =>
  async (content, res) => {
    const intermediateContent = await x(content, res);
    if (y) {
      return await y(intermediateContent, res);
    } else {
      return intermediateContent;
    }
  };

export const identifyResponseTransformer = (
  name: string,
  transformer: ResponseTransformer
): ResponseTransformer => {
  return async (content, res) => {
    try {
      return await transformer(content, res);
    } catch (e) {
      throw `${name}: ${e}`;
    }
  };
};
 