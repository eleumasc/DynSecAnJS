import puppeteer, { Browser, PuppeteerLaunchOptions } from "puppeteer";

export const useBrowser = async <T>(
  options: PuppeteerLaunchOptions | undefined,
  cb: (browser: Browser) => Promise<T>
) => {
  const browser = await puppeteer.launch(options);
  try {
    return await cb(browser);
  } finally {
    await browser.close();
  }
};
