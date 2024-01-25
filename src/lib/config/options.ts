import { PuppeteerLaunchOptions } from "puppeteer";

export const pptrLaunchOptions: PuppeteerLaunchOptions = {
  headless: false, // "new",
  defaultViewport: { width: 1280, height: 720 },
};

export const defaultAnalysisRepeat = 5;
