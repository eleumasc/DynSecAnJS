import { Agent, AgentController, UseOptions, Viewport } from "./Agent";
import puppeteer, {
  Browser,
  Page,
  PuppeteerLaunchOptions,
  TimeoutError,
} from "puppeteer";

import { localhost } from "../env";

export interface Options {
  pptrLaunchOptions?: PuppeteerLaunchOptions;
}

export class PuppeteerAgent implements Agent {
  constructor(readonly options: Options) {}

  async use<T>(
    useOptions: UseOptions,
    cb: (controller: AgentController) => Promise<T>
  ): Promise<T> {
    const { pptrLaunchOptions } = this.options;
    const { proxyPort } = useOptions;

    return useBrowser(
      {
        ...pptrLaunchOptions,
        args: [
          ...(pptrLaunchOptions?.args ?? []),
          `--proxy-server=${localhost}:${proxyPort}`,
        ],
        ignoreHTTPSErrors: true,
      },
      async (browser) =>
        await cb(new PuppeteerAgentController(await browser.newPage()))
    );
  }
}

export class PuppeteerAgentController implements AgentController {
  constructor(protected page: Page) {}

  async navigate(url: string, timeoutMs: number): Promise<void> {
    try {
      await this.page.goto(url, { timeout: timeoutMs });
    } catch (e) {
      if (e instanceof TimeoutError) {
        return;
      }
      throw e;
    }
  }

  screenshot(): Promise<Buffer> {
    return this.page.screenshot();
  }

  async setViewport({ width, height }: Viewport): Promise<void> {
    await this.page.setViewport({ width, height });
  }
}

const useBrowser = async <T>(
  pptrLaunchOptions: PuppeteerLaunchOptions,
  cb: (browser: Browser) => Promise<T>
) => {
  const browser = await puppeteer.launch(pptrLaunchOptions);
  try {
    return await cb(browser);
  } finally {
    await browser.close();
  }
};
