import {
  Mockttp as MockttpServer,
  generateCACertificate,
  generateSPKIFingerprint,
  getLocal,
} from "mockttp";
import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from "puppeteer";
import { Analysis, AnalysisResult, FailureAnalysisResult } from "./Analysis";
import AnalysisProxy, { useAnalysisProxy } from "./AnalysisProxy";
import { timeBomb } from "./util/async";
import { useIncognitoBrowserContext, usePage } from "./util/browser";

export class PuppeteerProxyAnalysis implements Analysis {
  constructor(readonly browser: Browser, readonly server: MockttpServer) {}

  async run(url: string): Promise<AnalysisResult> {
    const runInPage = async (
      page: Page,
      analysisProxy: AnalysisProxy
    ): Promise<AnalysisResult> => {
      await page.goto(url, { timeout: 60_000 });
      return await timeBomb(analysisProxy.waitForCompleteAnalysis(), 15_000);
    };

    try {
      return await useAnalysisProxy(
        this.server,
        { isTopNavigationRequest: () => false, transform: async (x) => x },
        (analysisProxy) =>
          useIncognitoBrowserContext(
            this.browser,
            { proxyServer: `http://127.0.0.1:${analysisProxy.getPort()}` },
            (browserContext) =>
              usePage(browserContext, (page) => runInPage(page, analysisProxy))
          )
      );
    } catch (e) {
      return {
        status: "failure",
        reason: String(e),
      } satisfies FailureAnalysisResult;
    }
  }

  async terminate(): Promise<void> {
    await this.browser.close();
  }

  static async create(
    pptrLaunchOptions?: PuppeteerLaunchOptions
  ): Promise<PuppeteerProxyAnalysis> {
    const httpsOptions = await generateCACertificate();
    const server = getLocal({ https: httpsOptions });

    const browser = await puppeteer.launch({
      ...pptrLaunchOptions,
      args: [
        ...(pptrLaunchOptions?.args ?? []),
        `--proxy-server=per-context`,
        `--ignore-certificate-errors-spki-list=${generateSPKIFingerprint(
          httpsOptions.cert
        )}`,
      ],
    });

    return new PuppeteerProxyAnalysis(browser, server);
  }
}
