export type BrowserName = "Chromium-ES5" | "Firefox";

export const isBrowserName = (value: any): value is BrowserName => {
  switch (value as BrowserName) {
    case "Chromium-ES5":
    case "Firefox":
      return true;
    default:
      return false;
  }
};
