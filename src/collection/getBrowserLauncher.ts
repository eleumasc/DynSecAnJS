import { chromium, firefox } from "playwright";

import { BrowserName } from "./BrowserName";

export const getBrowserLauncher = (browserName: BrowserName) => {
  switch (browserName) {
    case "Chromium":
      return chromium;
    case "Firefox":
      return firefox;
  }
};
