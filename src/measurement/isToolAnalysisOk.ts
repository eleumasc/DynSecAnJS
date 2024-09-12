export const isToolAnalysisOk = (
  toolName: string,
  execution: any /* ExecutionDetail */
): boolean => {
  switch (toolName) {
    case "ChromiumTaintTracking":
    case "JSFlow":
    case "ProjectFoxhound": {
      return true;
    }
    case "JEST":
    case "IF-Transpiler":
    case "GIFC":
    case "Linvail":
    case "Jalangi":
    case "JalangiTT":
      return execution.transformErrors.length === 0;
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
