import { SimpleVisitors } from "acorn-walk";
import { DiffEvidence } from "./DiffEvidence";
import { DiffCheckers, VisitorType, VisitorTypeName } from "./DiffCheckers";

export type DiffVisitors = SimpleVisitors<DiffVisitorsState>;

export interface DiffVisitorsState {
  evidences: DiffEvidence[];
}

export const createDiffVisitors = (
  diffCheckers: DiffCheckers
): DiffVisitors => {
  const createVisitor = <TypeName extends VisitorTypeName>(
    typeName: TypeName
  ): DiffVisitors[TypeName] => {
    const typeDiffCheckers = diffCheckers[typeName];
    if (!typeDiffCheckers) {
      return undefined;
    }
    return (node: VisitorType<TypeName>, state: DiffVisitorsState) => {
      for (const diffChecker of typeDiffCheckers) {
        const evidence = diffChecker(node);
        if (evidence) {
          state.evidences = [...state.evidences, evidence];
        }
      }
    };
  };

  let result: DiffVisitors = {};
  for (const typeName of Object.keys(
    diffCheckers
  ) as Iterable<VisitorTypeName>) {
    result = { ...result, [typeName]: createVisitor(typeName) };
  }
  return result;
};
