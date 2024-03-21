import { Response } from "./AnalysisProxy";

export type ResponseTransformer = (content: string, res: Response) => Promise<string>;
