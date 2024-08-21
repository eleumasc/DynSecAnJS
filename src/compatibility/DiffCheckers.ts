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
import SyntaxFeature from "./SyntaxFeature";

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
  protected _feature: SyntaxFeature | null = null;

  constructor(readonly esVersion: ESVersion) {}

  protected addDiffChecker<TypeName extends VisitorTypeName>(
    typeName: TypeName,
    diffChecker: DiffChecker<VisitorType<TypeName>>
  ) {
    this.diffCheckers = {
      ...this.diffCheckers,
      [typeName]: [...(this.diffCheckers[typeName] ?? []), diffChecker],
    };
  }

  intro(featureName: string) {
    const { esVersion } = this;
    this._feature = new SyntaxFeature(featureName, esVersion);
    return this;
  }

  get currentFeature(): SyntaxFeature {
    const feature = this._feature;
    assert(feature !== null, "Use intro() first to introduce a feature");
    return feature;
  }

  definesNode<TypeName extends VisitorTypeName>(typeName: TypeName) {
    const { currentFeature: feature } = this;
    this.addDiffChecker(typeName, (node) => {
      return <NodeDiffEvidence>{
        type: "node",
        feature,
        nodeType: node.type,
      };
    });
    return this;
  }

  extendsProp<
    Base extends VisitorTypeName,
    Prop extends keyof VisitorType<Base>
  >(
    base: Base,
    prop: Prop,
    diffTypeChecker: TypeChecker<VisitorType<Base>[Prop]>
  ) {
    const { currentFeature: feature } = this;
    this.addDiffChecker(base, (node) => {
      const value = node[prop];
      if (diffTypeChecker(value)) {
        return <PropDiffEvidence>{
          type: "prop",
          feature: feature,
          base,
          prop,
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
          ...(acc[typeName as VisitorTypeName] ?? []),
          ...typeDiffCheckers,
        ],
      };
    }
    return acc;
  }, {});
};
