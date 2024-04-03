import { Response } from "./AnalysisProxy";

export type BodyTransformer = (
  content: string,
  res: Response
) => Promise<string>;

export class BodyTransformerError extends Error {
  constructor(readonly transformName: string, readonly message: string) {
    super(message);
    this.name = `${BodyTransformerError.name}(${transformName})`;
  }
}

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

export const bodyTransformerWithName = (
  name: string,
  transformer: BodyTransformer
): BodyTransformer => {
  return async (content, res) => {
    try {
      return await transformer(content, res);
    } catch (e) {
      throw new BodyTransformerError(name, String(e));
    }
  };
};
