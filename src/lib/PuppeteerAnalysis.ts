import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from "puppeteer";
import { Analysis } from "./Analysis";
import {
  AnalysisResult,
  FailureAnalysisResult,
  SuccessAnalysisResult,
} from "./AnalysisResult";
import FeatureSet from "./FeatureSet";
import {
  ExposedFunctionReporter,
  MonitorReport,
  bundleMonitor,
} from "./monitor";
import { timeBomb } from "./util/async";
import { useIncognitoBrowserContext, usePage } from "./util/browser";
import Deferred from "./util/Deferred";
import {
  defaultAnalysisTimeoutMs,
  defaultNavigationTimeoutMs,
} from "./config/options";

const REPORTER_FUNCTION_NAME = "$__report";

export class PuppeteerAnalysis implements Analysis {
  constructor(readonly browser: Browser, readonly monitor: string) {}

  async run(url: string): Promise<AnalysisResult> {
    const runInPage = async (page: Page): Promise<AnalysisResult> => {
      const willReceiveMonitorReport = new Deferred<MonitorReport>();
      await page.exposeFunction(
        REPORTER_FUNCTION_NAME,
        (monitorReport: MonitorReport) => {
          willReceiveMonitorReport.resolve(monitorReport);
        }
      );
      await page.evaluateOnNewDocument(this.monitor);

      const targetSites = new Set<string>();
      const includedScriptUrls = new Set<string>();

      await page.setRequestInterception(true);
      page.on("request", (request) => {
        try {
          const url = request.url();
          const parsedUrl = new URL(url);
          const { protocol, hostname } = parsedUrl;

          if (protocol === "http:" || protocol === "https:") {
            targetSites.add(hostname);
          }

          if (request.resourceType() === "script") {
            includedScriptUrls.add(url);
          }
        } finally {
          request.continue();
        }
      });

      await page.goto(url, { timeout: defaultNavigationTimeoutMs });
      const monitorReport = await timeBomb(
        willReceiveMonitorReport.promise,
        defaultAnalysisTimeoutMs
      );
      const {
        pageUrl,
        uncaughtErrors,
        consoleMessages,
        calledBuiltinMethods,
        cookieKeys,
        localStorageKeys,
        sessionStorageKeys,
      } = monitorReport;
      return {
        status: "success",
        pageUrl,
        featureSet: new FeatureSet(
          new Set(uncaughtErrors),
          new Set(consoleMessages),
          new Set(calledBuiltinMethods),
          new Set(cookieKeys),
          new Set(localStorageKeys),
          new Set(sessionStorageKeys),
          new Set(targetSites),
          new Set(includedScriptUrls)
        ),
      } satisfies SuccessAnalysisResult;
    };

    try {
      return await useIncognitoBrowserContext(
        this.browser,
        undefined,
        (browserContext) => usePage(browserContext, (page) => runInPage(page))
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
  ): Promise<PuppeteerAnalysis> {
    const browser = await puppeteer.launch(pptrLaunchOptions);
    const monitor = await bundleMonitor(<ExposedFunctionReporter>{
      type: "ExposedFunctionReporter",
      functionName: REPORTER_FUNCTION_NAME,
    });
    return new PuppeteerAnalysis(browser, monitor);
  }
}
