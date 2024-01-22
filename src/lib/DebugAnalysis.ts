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

const REPORTER_FUNCTION_NAME = "$__report";

export class DebugAnalysis implements Analysis {
  constructor(readonly browser: Browser, readonly monitor: string) {}

  async run(url: string): Promise<AnalysisResult> {
    const runInPage = async (page: Page): Promise<AnalysisResult> => {
      const willReceiveMonitorReport = new Completer<MonitorReport>();
      await page.exposeFunction(
        REPORTER_FUNCTION_NAME,
        (monitorReport: MonitorReport) => {
          willReceiveMonitorReport.complete(monitorReport);
        }
      );
      await page.evaluateOnNewDocument(this.monitor);

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

    try {
      return await useIncognitoBrowserContext(this.browser, (browserContext) =>
        usePage(browserContext, runInPage)
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
  ): Promise<DebugAnalysis> {
    const browser = await puppeteer.launch(pptrLaunchOptions);
    const monitor = await bundleMonitor(<ExposedFunctionReporter>{
      type: "ExposedFunctionReporter",
      functionName: REPORTER_FUNCTION_NAME,
    });
    return new DebugAnalysis(browser, monitor);
  }
}
