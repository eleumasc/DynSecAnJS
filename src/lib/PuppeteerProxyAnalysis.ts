import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from "puppeteer";
import Completer from "./util/Completer";
import { DefaultFeatureSet } from "./DefaultFeatureSet";
import { timeBomb } from "./util/async";
import { useIncognitoBrowserContext, usePage } from "./util/browser";
import {
  ExposedFunctionReporter,
  MonitorReport,
  bundleMonitor,
} from "./monitor";
import {
  Analysis,
  AnalysisResult,
  FailureAnalysisResult,
  SuccessAnalysisResult,
} from "./Analysis";
import { useVirusProxy } from "./VirusProxy";
import {
  Mockttp as MockttpServer,
  generateCACertificate,
  generateSPKIFingerprint,
  getLocal,
} from "mockttp";

const REPORTER_FUNCTION_NAME = "$__report";

export class PuppeteerProxyAnalysis implements Analysis {
  constructor(
    readonly browser: Browser,
    readonly server: MockttpServer,
    readonly monitor: string
  ) {}

  async run(url: string): Promise<AnalysisResult> {
    const runInPage = async (page: Page): Promise<AnalysisResult> => {
      const willReceiveMonitorReport = new Completer<MonitorReport>();
      await page.exposeFunction(
        REPORTER_FUNCTION_NAME,
        (monitorReport: MonitorReport) => {
          willReceiveMonitorReport.complete(monitorReport);
        }
      );

      const targetSites = new Set<string>();
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        try {
          const url = new URL(request.url());
          const { protocol, hostname } = url;
          if (protocol === "http:" || protocol === "https:") {
            targetSites.add(hostname);
          }
        } finally {
          request.continue();
        }
      });

      await page.goto(url, { timeout: 60_000 });
      const pageUrl = page.url();
      const monitorReport = await timeBomb(
        willReceiveMonitorReport.promise,
        15_000
      );
      const {
        uncaughtErrors,
        consoleMessages,
        calledNativeMethods,
        cookieKeys,
        localStorageKeys,
        sessionStorageKeys,
      } = monitorReport;
      return {
        status: "success",
        pageUrl,
        featureSet: new DefaultFeatureSet(
          new Set(uncaughtErrors),
          new Set(consoleMessages),
          new Set(calledNativeMethods),
          new Set(cookieKeys),
          new Set(localStorageKeys),
          new Set(sessionStorageKeys),
          new Set(targetSites)
        ),
      } satisfies SuccessAnalysisResult;
    };

    const transformer = async (body: string): Promise<string> => {
      const index = body.indexOf("<script "); // TODO: fix
      if (index !== -1) {
        return (
          body.substring(0, index) +
          `<script>${this.monitor}</script>` +
          body.substring(index)
        );
      }
      return body;
    };

    try {
      return await useVirusProxy(this.server, transformer, (virusProxy) =>
        useIncognitoBrowserContext(
          this.browser,
          { proxyServer: `http://127.0.0.1:${virusProxy.port()}` },
          (browserContext) => usePage(browserContext, runInPage)
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

    const monitor = await bundleMonitor(<ExposedFunctionReporter>{
      type: "ExposedFunctionReporter",
      functionName: REPORTER_FUNCTION_NAME,
    });

    return new PuppeteerProxyAnalysis(browser, server, monitor);
  }
}
