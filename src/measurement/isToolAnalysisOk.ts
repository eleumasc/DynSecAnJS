import { ExecutionDetail } from "../lib/ExecutionDetail";

export const isToolAnalysisOk = (
  toolName: string,
  execution: ExecutionDetail
): boolean => {
  switch (toolName) {
    case "ChromiumTaintTracking":
    case "JSFlow":
    case "ProjectFoxhound": {
      return true;
    }
    case "JEST":
    case "IFTranspiler":
    case "GIFC":
    case "JalangiTT":
      return execution.transformErrors.length === 0;
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
