import { ToolName } from "../collection/ToolName";

export enum CompatibilityIssue {
  CrashError = "CrashError",
  TranspileError = "TranspileError",
  ParseError = "ParseError",
  AnalysisError = "AnalysisError",
  UnknownError = "UnknownError",
}

export const findParseOrAnalysisError = (
  toolName: ToolName,
  transformErrors: string[]
): CompatibilityIssue | null => {
  const { parseErrorPatterns, analysisErrorPatterns } =
    getCompatibilityIssuePatterns(toolName);

  if (
    transformErrors.some((message) =>
      parseErrorPatterns.some((pattern) => pattern.test(message))
    )
  ) {
    return CompatibilityIssue.ParseError;
  }

  if (
    transformErrors.some((message) =>
      analysisErrorPatterns.some((pattern) => pattern.test(message))
    )
  ) {
    return CompatibilityIssue.AnalysisError;
  }

  return null;
};

interface CompatibilityIssuePatterns {
  parseErrorPatterns: RegExp[];
  analysisErrorPatterns: RegExp[];
}

const getCompatibilityIssuePatterns = (
  toolName: ToolName
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
    case "IF-Transpiler":
      return {
        parseErrorPatterns: [
          /SyntaxError/,
          /Unexpected token/,
          /unexpected end of file/,
          /at parseProgram/,
        ],
        analysisErrorPatterns: [
          /AssertionError/,
          /RangeError/,
          /TypeError/,
          /Unsupported Node Type/,
          /Parent Node of/,
          /at Visitor.visit/,
          /at Controller.enter/,
        ],
      };
    case "LinvailTaint":
      return {
        parseErrorPatterns: [/SyntaxError/],
        analysisErrorPatterns: [/TypeError/, />> undefined/],
      };
    case "JalangiTT":
      return {
        parseErrorPatterns: [/SyntaxError/],
        analysisErrorPatterns: [/TypeError/],
      };
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
