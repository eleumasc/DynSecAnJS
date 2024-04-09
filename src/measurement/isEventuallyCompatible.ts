import { ExecutionDetail } from "../lib/ExecutionDetail";

export const isEventuallyCompatible = (
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
    case "Jalangi":
    case "Linvail":
      return execution.transformErrors.length === 0;
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
