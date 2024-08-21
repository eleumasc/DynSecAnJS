import SyntaxFeature from "./SyntaxFeature";

export interface DiffEvidence {
  type: string;
  feature: SyntaxFeature;
}

export interface NodeDiffEvidence extends DiffEvidence {
  type: "node";
  nodeType: string;
}

export interface PropDiffEvidence extends DiffEvidence {
  type: "prop";
  base: string;
  prop: string;
}
