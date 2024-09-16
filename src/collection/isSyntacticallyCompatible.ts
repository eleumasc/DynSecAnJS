import { BrowserOrToolName, getBrowserNameByToolName } from "./ToolName";
import { ESVersion, lessOrEqualToESVersion } from "../syntax/ESVersion";
import { isBrowserName } from "./BrowserName";

export const isSyntacticallyCompatible = (
  browserOrToolName: BrowserOrToolName,
  siteESVersion: ESVersion
): boolean => {
  const browserName = isBrowserName(browserOrToolName)
    ? browserOrToolName
    : getBrowserNameByToolName(browserOrToolName);

  switch (browserName) {
    case "Chromium-ES5":
      return !lessOrEqualToESVersion(siteESVersion, ESVersion.ES5);
    case "Firefox":
      return true;
  }
};
