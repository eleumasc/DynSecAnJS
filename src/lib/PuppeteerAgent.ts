import {
  Agent,
  NavigateOptions,
  PageController,
  UsePageOptions,
} from "./Agent";
import puppeteer, {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  Page,
  PuppeteerLaunchOptions,
} from "puppeteer";

import CA from "../core/CA";
import { timeBomb } from "../core/async";

export interface Options {
  pptrLaunchOptions?: PuppeteerLaunchOptions;
}

export class PuppeteerAgent implements Agent {
  constructor(readonly browser: Browser, readonly options: Options) {}

  async usePage<T>(
    options: UsePageOptions,
    cb: (page: PageController) => Promise<T>
  ): Promise<T> {
    const { proxyPort } = options;

    return useBrowserContext(
      this.browser,
      { proxyServer: `127.0.0.1:${proxyPort}` },
      (browserContext) =>
        usePage(browserContext, async (page) =>
          cb(new PuppeteerPageController(page))
        )
    );
  }

  async terminate(): Promise<void> {
    await this.browser.close();
  }

  static async create<T>(options: Options): Promise<PuppeteerAgent> {
    const { pptrLaunchOptions } = options;

    const browser = await puppeteer.launch({
      ...pptrLaunchOptions,
      args: [
        ...(pptrLaunchOptions?.args ?? []),
        `--proxy-server=per-context`,
        `--ignore-certificate-errors-spki-list=${CA.get().getSPKIFingerprint()}`,
      ],
    });

    return new PuppeteerAgent(browser, options);
  }
}

export class PuppeteerPageController implements PageController {
  constructor(protected page: Page) {}

  async navigate(url: string, { timeoutMs }: NavigateOptions): Promise<void> {
    try {
      await this.page.goto(url, { timeout: timeoutMs });
    } catch {}
  }

  screenshot(): Promise<Buffer> {
    return this.page.screenshot();
  }
}

const useBrowserContext = async <T>(
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

const usePage = async <T>(
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
