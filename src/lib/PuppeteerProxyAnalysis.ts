import {
  Mockttp as MockttpServer,
  generateCACertificate,
  generateSPKIFingerprint,
  getLocal,
} from "mockttp";
import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from "puppeteer";
import { Analysis } from "./Analysis";
import { AnalysisResult, FailureAnalysisResult } from "./AnalysisResult";
import AnalysisProxy, { Transformer, useAnalysisProxy } from "./AnalysisProxy";
import { timeBomb } from "./util/async";
import { useIncognitoBrowserContext, usePage } from "./util/browser";
import {
  defaultAnalysisTimeoutMs,
  defaultNavigationTimeoutMs,
} from "./config/options";
import { LogfileAttachmentFile } from "./LogfileAttachment";

const TOP_NAVIGATION_REQUEST_HEADER = "x-top-navigation-request";

export interface PuppeteerProxyAnalysisOptions {
  transform: Transformer;
}

export class PuppeteerProxyAnalysis implements Analysis {
  constructor(
    readonly browser: Browser,
    readonly server: MockttpServer,
    readonly options: PuppeteerProxyAnalysisOptions
  ) {}

  async run(url: string, label: string): Promise<AnalysisResult> {
    const { transform } = this.options;

    const runInPage = async (
      page: Page,
      analysisProxy: AnalysisProxy
    ): Promise<AnalysisResult> => {
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        request.continue({
          headers: {
            ...request.headers(),
            [TOP_NAVIGATION_REQUEST_HEADER]:
              request.resourceType() === "document" &&
              request.frame() === page.mainFrame()
                ? "1"
                : "0",
          },
        });
      });

      await page.goto(url, { timeout: defaultNavigationTimeoutMs });
      const result = await timeBomb(
        analysisProxy.waitForCompleteAnalysis(),
        defaultAnalysisTimeoutMs
      );
      return {
        ...result,
        screenshot: new LogfileAttachmentFile(
          `${label}.png`,
          await page.screenshot()
        ),
      };
    };

    try {
      return await useAnalysisProxy(
        this.server,
        {
          isTopNavigationRequest: (req) => {
            return req.headers[TOP_NAVIGATION_REQUEST_HEADER] === "1";
          },
          transform,
        },
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
    analysisOptions: PuppeteerProxyAnalysisOptions,
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

    return new PuppeteerProxyAnalysis(browser, server, analysisOptions);
  }
}
