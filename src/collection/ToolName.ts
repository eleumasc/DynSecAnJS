import { BrowserName } from "./BrowserName";

export type ToolName =
  | "JEST"
  | "IFTranspiler"
  | "GIFC"
  | "JalangiTT"
  | "ProjectFoxhound";

export type BrowserOrToolName = BrowserName | ToolName;

export const isToolName = (value: any): value is ToolName => {
  switch (value as ToolName) {
    case "JEST":
    case "IFTranspiler":
    case "GIFC":
    case "JalangiTT":
    case "ProjectFoxhound":
      return true;
    default:
      return false;
  }
};

export const getBrowserNameByToolName = (toolName: ToolName): BrowserName => {
  switch (toolName) {
    case "JEST":
    case "IFTranspiler":
    case "GIFC":
    case "JalangiTT":
      return "Chromium-ES5";
    case "ProjectFoxhound":
      return "Firefox";
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
