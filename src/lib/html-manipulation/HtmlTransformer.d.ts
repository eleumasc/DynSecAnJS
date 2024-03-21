import { Node } from "parse5/dist/tree-adapters/default";

export type HtmlTransformer = (document: Node) => Promise<void>;
