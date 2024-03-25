import { Options as ParseOptions, Program, parse } from "acorn";
import { Category } from "./CompatibilityDetail";
import { collectDiffEvidences } from "./collectDiffEvidences";
import { distinctArray } from "../util/Array";

export const analyzeScript = (
  code: string,
  isEventHandler: boolean = false
): Category[] => {
  let program: Program;
  const parseOptions = <ParseOptions>{
    ecmaVersion: 2022,
    allowReturnOutsideFunction: isEventHandler,
  };
  try {
    program = parse(code, parseOptions);
  } catch (e) {
    try {
      program = parse(code, {
        ...parseOptions,
        sourceType: "module",
      });
    } catch {
      try {
        JSON.parse(code);
        return [];
      } catch {
        throw e;
      }
    }
  }
  return distinctArray(
    collectDiffEvidences(program).map(({ category }) => category)
  );
};
