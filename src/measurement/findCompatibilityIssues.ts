import { TransformErrorDetail } from "../lib/ExecutionDetail";

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
  if (
    transformErrors === null ||
    transformErrors.some((detail) => detail.message.includes("Memory exceeded"))
  ) {
    return new Set([CompatibilityIssue.CrashError]);
  }

  if (transformErrors.some((detail) => detail.transformName === "Babel")) {
    return new Set([CompatibilityIssue.BabelError]);
  }

  const toolErrorMessages = transformErrors
    .filter((detail) => detail.transformName === "Tool")
    .map((detail) => detail.message);

  const { parseErrorPatterns, analysisErrorPatterns } =
    getCompatibilityIssuePatterns(toolName);

  if (
    toolErrorMessages.some((message) =>
      parseErrorPatterns.some((pattern) => pattern.test(message))
    )
  ) {
    return new Set([CompatibilityIssue.ParseError]);
  }

  if (
    toolErrorMessages.some((message) =>
      analysisErrorPatterns.some((pattern) => pattern.test(message))
    )
  ) {
    return new Set([CompatibilityIssue.AnalysisError]);
  }

  return new Set(toolErrorMessages);
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
        parseErrorPatterns: [/jest: user error/, /SyntaxError/],
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
