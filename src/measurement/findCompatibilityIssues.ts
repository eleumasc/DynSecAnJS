import { TransformErrorDetail } from "../lib/ExecutionDetail";
import assert from "assert";

export enum CompatibilityIssue {
  CrashError = "CrashError",
  BabelError = "BabelError",
  ParseError = "ParseError",
  AnalysisError = "AnalysisError",
}

export const findCompatibilityIssues = (
  transformErrors: TransformErrorDetail[] | null,
  toolName: string
): Set<string> => {
  if (transformErrors === null) {
    return new Set([CompatibilityIssue.CrashError]);
  }

  const issues = new Set<string>();

  if (transformErrors.some((detail) => detail.transformName === "Babel")) {
    issues.add(CompatibilityIssue.BabelError);
  }

  const toolErrorMessages = transformErrors
    .filter((detail) => detail.transformName === "Tool")
    .map((detail) => detail.message);

  const { parseErrorPatterns, analysisErrorPatterns } =
    getCompatibilityIssuePatterns(toolName);

  for (const message of toolErrorMessages) {
    const parseErrorMessage = parseErrorPatterns.some((pattern) =>
      pattern.test(message)
    );
    const analysisErrorMessage = analysisErrorPatterns.some((pattern) =>
      pattern.test(message)
    );

    assert(!parseErrorMessage || !analysisErrorMessage);

    if (parseErrorMessage) {
      issues.add(CompatibilityIssue.ParseError);
    } else if (analysisErrorMessage) {
      issues.add(CompatibilityIssue.AnalysisError);
    } else {
      issues.add(message);
    }
  }

  return issues;
};

interface CompatibilityIssuePatterns {
  parseErrorPatterns: RegExp[];
  analysisErrorPatterns: RegExp[];
}

const getCompatibilityIssuePatterns = (
  toolName: string
): CompatibilityIssuePatterns => {
  switch (toolName) {
    case "ProjectFoxhound":
      return {
        parseErrorPatterns: [],
        analysisErrorPatterns: [],
      };
    case "JEST":
      return {
        parseErrorPatterns: [/jest: user error/],
        analysisErrorPatterns: [
          /TypeError: fetch failed/,
          /Error: Failed to inline external script/,
          /Non-exhaustive patterns in case/,
          /jest: reqURIAuth: no URI authority/,
          /jest: unexpected multiple control-flow annotations on an entry node/,
          /TypeError: terminated/,
        ],
      };
    case "IFTranspiler":
      return {
        parseErrorPatterns: [/at parseProgram/],
        analysisErrorPatterns: [/at Visitor.visit/, /at Controller.enter/],
      };
    case "GIFC":
    case "Linvail":
      return {
        parseErrorPatterns: [/SyntaxError/],
        analysisErrorPatterns: [/TypeError/],
      };
    case "Jalangi":
      return {
        parseErrorPatterns: [/SyntaxError/],
        analysisErrorPatterns: [],
      };
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
