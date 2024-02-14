import { PuppeteerLaunchOptions } from "puppeteer";

export const defaultPptrLaunchOptions: PuppeteerLaunchOptions = {
  headless: "new",
  defaultViewport: { width: 1280, height: 720 },
};

export const defaultAnalysisRepeat = 5;

export const defaultAnalysisTimeoutMs = 120_000;

export const defaultAnalysisDelayMs = 15_000;

export const defaultFaultAwarenessTimeoutMs = 150_000;
