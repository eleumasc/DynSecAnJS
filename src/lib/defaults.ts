import { PuppeteerLaunchOptions } from "puppeteer";
import { headless } from "./env";

export const defaultPptrLaunchOptions: PuppeteerLaunchOptions = {
  headless,
  defaultViewport: { width: 1280, height: 720 },
};

export const defaultAnalysisRepeat = 5;

export const defaultLoadingTimeoutMs = 120_000;

export const defaultAnalysisDelayMs = 15_000;

export const defaultFaultAwarenessTimeoutMs = 150_000;
