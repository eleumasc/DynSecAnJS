import { BrowserName } from "./BrowserName";

export type ToolName =
  | "JEST"
  | "IF-Transpiler"
  | "GIFC"
  | "LinvailTaint"
  | "JalangiTT"
  | "ProjectFoxhound"
  | "PanoptiChrome";

export type BrowserOrToolName = BrowserName | ToolName;

export const isToolName = (value: any): value is ToolName => {
  switch (value as ToolName) {
    case "JEST":
    case "IF-Transpiler":
    case "GIFC":
    case "LinvailTaint":
    case "JalangiTT":
    case "ProjectFoxhound":
    case "PanoptiChrome":
      return true;
    default:
      return false;
  }
};

export const getBrowserNameByToolName = (toolName: ToolName): BrowserName => {
  switch (toolName) {
    case "JEST":
    case "IF-Transpiler":
    case "GIFC":
    case "LinvailTaint":
    case "JalangiTT":
      return "Chromium-ES5";
    case "ProjectFoxhound":
      return "Firefox";
    case "PanoptiChrome":
      return "Chromium";
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
