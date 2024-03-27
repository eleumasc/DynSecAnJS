import { PuppeteerLaunchOptions } from "puppeteer";
import { headless } from "./env";

export const defaultPptrLaunchOptions: PuppeteerLaunchOptions = {
  headless: headless ? "new" : false,
  defaultViewport: { width: 1280, height: 720 },
};

export const defaultAnalysisRepeat = 5;

export const defaultLoadingTimeoutMs = 2 * 60_000;

export const defaultDelayMs = 15_000;

export const defaultFaultAwarenessDeltaMs = 30_000;
