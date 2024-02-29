import assert from "assert";
import acorn from "acorn";
import { SimpleVisitors } from "acorn-walk";
import { ESVersion } from "./ESVersion";
import {
  DiffEvidence,
  NodeDiffEvidence,
  PropDiffEvidence,
} from "./DiffEvidence";
import { TypeChecker } from "./TypeChecker";
import { Category } from "./CompatibilityDetail";

export type VisitorTypeName = keyof SimpleVisitors<any>;

export type VisitorType<TypeName extends VisitorTypeName> = Parameters<
  Exclude<SimpleVisitors<any>[TypeName], undefined>
>[0];

export type DiffChecker<TNode extends acorn.Node> = (
  node: TNode
) => DiffEvidence | void;

export type DiffCheckers = {
  [typeName in VisitorTypeName]?: DiffChecker<VisitorType<typeName>>[];
};

export class DiffCheckersBuilder {
  protected diffCheckers: DiffCheckers = {};
  protected _category: Category | null = null;

  constructor(readonly esVersion: ESVersion) {}

  protected addDiffChecker<TypeName extends VisitorTypeName>(
    typeName: TypeName,
    diffChecker: DiffChecker<VisitorType<TypeName>>
  ) {
    this.diffCheckers = {
      ...this.diffCheckers,
      [typeName]: [...(this.diffCheckers[typeName] || []), diffChecker],
    };
  }

  intro(categoryName: string) {
    this._category = { name: categoryName, esVersion: this.esVersion };
    return this;
  }

  get category(): Category {
    const category = this._category;
    assert(
      category !== null,
      "Please use intro() first to introduce a category"
    );
    return category;
  }

  definesNode<TypeName extends VisitorTypeName>(typeName: TypeName) {
    const { category } = this;
    this.addDiffChecker(typeName, (node) => {
      return <NodeDiffEvidence>{
        kind: "node",
        category,
        type: node.type,
      };
    });
    return this;
  }

  extendsProp<
    TypeName extends VisitorTypeName,
    PropName extends keyof VisitorType<TypeName>
  >(
    typeName: TypeName,
    propName: PropName,
    diffTypeChecker: TypeChecker<VisitorType<TypeName>[PropName]>
  ) {
    const { category } = this;
    this.addDiffChecker(typeName, (node) => {
      const value = node[propName];
      if (diffTypeChecker(value)) {
        return <PropDiffEvidence>{
          kind: "prop",
          category,
          type: typeName,
          prop: propName,
        };
      }
    });
    return this;
  }

  build(): DiffCheckers {
    return this.diffCheckers;
  }
}

export const combineDiffCheckersArray = (
  diffCheckersArray: DiffCheckers[]
): DiffCheckers => {
  return diffCheckersArray.reduce((acc, cur) => {
    for (const [typeName, typeDiffCheckers] of Object.entries(cur)) {
      acc = {
        ...acc,
        [typeName as VisitorTypeName]: [
          ...(acc[typeName as VisitorTypeName] || []),
          ...typeDiffCheckers,
        ],
      };
    }
    return acc;
  }, {});
};
