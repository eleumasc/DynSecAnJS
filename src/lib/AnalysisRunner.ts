import { Browser } from "puppeteer";
import Completer from "./util/Completer";
import { DefaultFeatureSet } from "./DefaultFeatureSet";
import { timeBomb } from "./util/async";
import {
  AnalysisResult,
  FailureAnalysisResult,
  GatheringReport,
  SuccessAnalysisResult,
} from "../model";

export class AnalysisRunner {
  constructor(readonly analysisCode: string) {}

  async runAnalysis(browser: Browser, site: string): Promise<AnalysisResult> {
    const page = await browser.newPage();

    const willReceiveGatheringReport = new Completer<GatheringReport>();
    await page.exposeFunction(
      "$__report",
      (gatheringReport: GatheringReport) => {
        willReceiveGatheringReport.complete(gatheringReport);
      }
    );
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
      await page.goto(`http://${site}/`, { timeout: 60000 });
      const pageUrl = page.url();
      const gatheringReport = await timeBomb(
        willReceiveGatheringReport.promise,
        15000
      );
      const {
        uncaughtErrors,
        consoleMessages,
        calledNativeMethods,
        cookieKeys,
        localStorageKeys,
        sessionStorageKeys,
      } = gatheringReport;
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
