import {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  Page,
} from "puppeteer";
import { timeBomb } from "./async";

export const useBrowserContext = async <T>(
  browser: Browser,
  options: BrowserContextOptions | undefined,
  cb: (browserContext: BrowserContext) => Promise<T>
) => {
  const browserContext = await browser.createIncognitoBrowserContext(options);
  try {
    return await cb(browserContext);
  } finally {
    await browserContext.close();
  }
};

export const usePage = async <T>(
  browserContext: BrowserContext,
  cb: (page: Page) => Promise<T>
) => {
  const page = await browserContext.newPage();
  try {
    return await cb(page);
  } finally {
    try {
      await timeBomb(page.close(), 3_000);
    } catch {}
  }
};
