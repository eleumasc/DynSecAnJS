import { Browser, Page } from "playwright";

export const usePlaywrightPage = async <T>(
  browserFactory: () => Promise<Browser>,
  use: (page: Page) => Promise<T>
): Promise<T> => {
  const browser = await browserFactory();

  try {
    const browserContext = await browser.newContext({
      ignoreHTTPSErrors: true,
    });

    const page = await browserContext.newPage();

    return await use(page);
  } finally {
    await browser.close();
  }
};
