import { Category } from "./CompatibilityDetail";

export interface DiffEvidence {
  kind: string;
  category: Category;
}

export interface NodeDiffEvidence extends DiffEvidence {
  kind: "node";
  type: string;
}

export interface PropDiffEvidence extends DiffEvidence {
  kind: "prop";
  type: string;
  prop: string;
}
