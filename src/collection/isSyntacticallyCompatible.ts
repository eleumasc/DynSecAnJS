import { BrowserOrToolName, getBrowserNameByToolName } from "./ToolName";
import { ESVersion, lessOrEqualToESVersion } from "../syntax/ESVersion";
import { isBrowserName } from "./BrowserName";

export const isSyntacticallyCompatible = (
  browserOrToolName: BrowserOrToolName,
  otherESVersion: ESVersion
): boolean => {
  const browserName = isBrowserName(browserOrToolName)
    ? browserOrToolName
    : getBrowserNameByToolName(browserOrToolName);

  switch (browserName) {
    case "Chromium-ES5":
      return lessOrEqualToESVersion(otherESVersion, ESVersion.ES5);
    case "Firefox":
      return true;
  }
};
