import {
  Mockttp as MockttpServer,
  generateSPKIFingerprint,
  getLocal,
} from "mockttp";
import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from "puppeteer";
import { ExecutionDetail } from "./ExecutionAnalysis";
import MonitorProxy, { Transformer, useMonitorProxy } from "./MonitorProxy";
import { timeBomb } from "./util/async";
import { useBrowserContext, usePage } from "./util/browser";
import { defaultAnalysisDelayMs, defaultAnalysisTimeoutMs } from "./defaults";
import { Agent, RunOptions } from "./Agent";
import CertificationAuthority from "./CertificationAuthority";
import { useWebPageReplay } from "./WebPageReplay";
import { Fallible } from "./util/Fallible";
import { DataAttachment } from "./Archive";

const TOP_NAVIGATION_REQUEST_HEADER = "x-top-navigation-request";

export interface Options {
  pptrLaunchOptions?: PuppeteerLaunchOptions;
  certificationAuthority: CertificationAuthority;
  transform?: Transformer;
}

export class PuppeteerAgent implements Agent {
  constructor(
    readonly browser: Browser,
    readonly mockttpServer: MockttpServer,
    readonly options: Options
  ) {}

  async run(runOptions: RunOptions): Promise<Fallible<ExecutionDetail>> {
    const { certificationAuthority, transform } = this.options;
    const { url, wprArchivePath, wprOperation, attachmentList } = runOptions;

    const runInPage = async (
      page: Page,
      monitorProxy: MonitorProxy
    ): Promise<ExecutionDetail> => {
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

      await page.goto(url, {
        timeout: defaultAnalysisTimeoutMs,
        waitUntil: "domcontentloaded",
      });

      const result = await timeBomb(
        monitorProxy.waitForCompleteAnalysis(),
        defaultAnalysisDelayMs
      );

      if (attachmentList) {
        attachmentList.add(
          "screenshot.png",
          new DataAttachment(await page.screenshot())
        );
      }

      return result;
    };

    try {
      return await useWebPageReplay(
        {
          operation: wprOperation ?? "replay",
          archivePath: wprArchivePath,
          certificationAuthority,
        },
        async (wpr) =>
          await useMonitorProxy(
            this.mockttpServer,
            {
              isTopNavigationRequest: (req) => {
                return req.headers[TOP_NAVIGATION_REQUEST_HEADER] === "1";
              },
              transform,
              httpForwardHost: wpr.getHttpHost(),
              httpsForwardHost: wpr.getHttpsHost(),
            },
            (monitorProxy) =>
              useBrowserContext(
                this.browser,
                { proxyServer: `127.0.0.1:${monitorProxy.getPort()}` },
                (browserContext) =>
                  usePage(browserContext, async (page) => {
                    const executionDetail = await runInPage(page, monitorProxy);
                    return {
                      status: "success",
                      val: executionDetail,
                    };
                  })
              )
          )
      );
    } catch (e) {
      return {
        status: "failure",
        reason: String(e),
      };
    }
  }

  async terminate(): Promise<void> {
    await this.browser.close();
  }

  static async create(options: Options): Promise<PuppeteerAgent> {
    const { pptrLaunchOptions, certificationAuthority } = options;
    const server = getLocal({
      https: {
        cert: certificationAuthority.getCertificate(),
        key: certificationAuthority.getKey(),
      },
      recordTraffic: false,
    });

    const browser = await puppeteer.launch({
      ...pptrLaunchOptions,
      args: [
        ...(pptrLaunchOptions?.args ?? []),
        `--proxy-server=per-context`,
        `--ignore-certificate-errors-spki-list=${generateSPKIFingerprint(
          certificationAuthority.getCertificate()
        )}`,
      ],
    });

    return new PuppeteerAgent(browser, server, options);
  }
}
