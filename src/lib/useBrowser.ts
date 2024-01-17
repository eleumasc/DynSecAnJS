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

export const useTwoBrowsers = async <T>(
  options: PuppeteerLaunchOptions | undefined,
  cb: (browsers: Browser[]) => Promise<T>
) =>
  await useBrowser(
    options,
    async (browser1) =>
      await useBrowser(
        options,
        async (browser2) => await cb([browser1, browser2])
      )
  );
