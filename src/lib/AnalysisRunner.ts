import { BrowserContext } from "puppeteer";
import Completer from "./util/Completer";
import { DefaultFeatureSet } from "./DefaultFeatureSet";
import { timeBomb } from "./util/async";
import {
  AnalysisResult,
  FailureAnalysisResult,
  SuccessAnalysisResult,
} from "../model";

interface PageReport {
  uncaughtErrors: string[];
  consoleMessages: string[];
  calledNativeMethods: string[];
  cookieKeys: string[];
  localStorageKeys: string[];
  sessionStorageKeys: string[];
}

export class AnalysisRunner {
  constructor(readonly analysisCode: string) {}

  async runAnalysis(
    browserContext: BrowserContext,
    url: string
  ): Promise<AnalysisResult> {
    const page = await browserContext.newPage();

    const willReceivePageReport = new Completer<PageReport>();
    await page.exposeFunction("$__report", (pageReport: PageReport) => {
      willReceivePageReport.complete(pageReport);
    });
    await page.evaluateOnNewDocument(this.analysisCode);

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

    try {
      await page.goto(url, { timeout: 60_000 });
      const pageUrl = page.url();
      const pageReport = await timeBomb(willReceivePageReport.promise, 15_000);
      const {
        uncaughtErrors,
        consoleMessages,
        calledNativeMethods,
        cookieKeys,
        localStorageKeys,
        sessionStorageKeys,
      } = pageReport;
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
    } catch (e) {
      return {
        status: "failure",
        reason: String(e),
      } satisfies FailureAnalysisResult;
    } finally {
      await page.close();
    }
  }
}
