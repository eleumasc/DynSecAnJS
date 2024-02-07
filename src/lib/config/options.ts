import { PuppeteerLaunchOptions } from "puppeteer";

export const defaultPptrLaunchOptions: PuppeteerLaunchOptions = {
  headless: "new",
  defaultViewport: { width: 1280, height: 720 },
};

export const defaultAnalysisRepeat = 5;

export const defaultNavigationTimeoutMs = 30_000;

export const defaultEvalTimeoutMs = 10_000;

export const defaultAnalysisTimeoutMs = 75000;
