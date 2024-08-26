export type BrowserName = "Chromium" | "Firefox";

export const isBrowserName = (value: any): value is BrowserName => {
  switch (value as BrowserName) {
    case "Chromium":
    case "Firefox":
      return true;
    default:
      return false;
  }
};
