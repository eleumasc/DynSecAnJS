import { BodyTransformer } from "../lib/ExecutionHooks";

export const composeBodyTransformers =
  (x: BodyTransformer, y?: BodyTransformer): BodyTransformer =>
  async (content, res) => {
    const intermediateContent = await x(content, res);
    if (y) {
      return await y(intermediateContent, res);
    } else {
      return intermediateContent;
    }
  };

export const identifyBodyTransformer = (
  name: string,
  transformer: BodyTransformer
): BodyTransformer => {
  return async (content, res) => {
    try {
      return await transformer(content, res);
    } catch (e) {
      throw `${name}: ${e}`;
    }
  };
};
