import { PuppeteerLaunchOptions } from "puppeteer";

export const pptrLaunchOptions: PuppeteerLaunchOptions = {
  headless: "new",
  defaultViewport: { width: 1280, height: 720 },
};

export const defaultAnalysisRepeat = 5;
