import puppeteer, { Browser, PuppeteerLaunchOptions } from "puppeteer";
import browserify from "browserify";

const main = async () => {
  const analysisCode = await new Promise<string>((resolve, reject) => {
    browserify({ basedir: "analysis" })
      .add("./index.js")
      .bundle((err, buf) => {
        if (err) {
          reject(err);
        } else {
          resolve(buf.toString());
        }
      });
  });

  await useBrowser(
    {
      headless: false, // "new"
      defaultViewport: { width: 1280, height: 720 },
    },
    async (browser) => {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(analysisCode);
      await page.goto("http://google.com/");

      await new Promise(() => {});

      await page.close();
    }
  );
};

const useBrowser = async <T>(
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

main();
