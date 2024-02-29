import { parse } from "acorn";
import { Category } from "./CompatibilityDetail";
import { collectDiffEvidences } from "./collectDiffEvidences";
import { distictArray } from "../util/array";

export const analyzeScript = (
  code: string,
  isEventHandler: boolean = false
): Category[] => {
  return distictArray(
    collectDiffEvidences(
      parse(code, {
        ecmaVersion: 2022,
        allowReturnOutsideFunction: isEventHandler,
      })
    ).map((diffEvidence) => diffEvidence.category)
  );
};
