import { PuppeteerLaunchOptions } from "puppeteer";
import { Viewport } from "../lib/Agent";
import { headless } from "../env";

export const defaultPptrLaunchOptions: PuppeteerLaunchOptions = {
  headless: headless ? "new" : false,
};

export const defaultAnalysisRepeat = 5;

export const defaultLoadingTimeoutMs = 2 * 60_000;

export const defaultToleranceMs = 30_000;

export const defaultViewport: Viewport = { width: 1280, height: 720 };
