import { Browser, BrowserContext, Page } from "puppeteer";

export const useIncognitoBrowserContext = async <T>(
  browser: Browser,
  cb: (browserContext: BrowserContext) => Promise<T>
) => {
  const browserContext = await browser.createIncognitoBrowserContext();
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
    await page.close();
  }
};
