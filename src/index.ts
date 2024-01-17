import puppeteer, { Browser, PuppeteerLaunchOptions } from "puppeteer";
import browserify from "browserify";
import Completer from "./util/Completer";
import { DefaultFeatureSet } from "./DefaultFeatureSet";
import { timeBomb } from "./util/async";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import {
  AnalysisResult,
  FailureAnalysisResult,
  GatheringReport,
  SuccessAnalysisResult,
} from "./model";

const main = async () => {
  const siteList = [
    "google.com",
    "amazonaws.com",
    "facebook.com",
    "microsoft.com",
    "a-msedge.net",
    "googleapis.com",
    "apple.com",
    "youtube.com",
    "akamaiedge.net",
    "akamai.net",
    "twitter.com",
    "instagram.com",
    "googlevideo.com",
    "azure.com",
    "gstatic.com",
    "cloudflare.com",
    "linkedin.com",
    "tiktokcdn.com",
    "live.com",
    "windowsupdate.com",
    "netflix.com",
    "office.com",
    "akadns.net",
    "doubleclick.net",
    "googletagmanager.com",
    "apple-dns.net",
    "amazon.com",
    "fbcdn.net",
    "trafficmanager.net",
    "microsoftonline.com",
    "wikipedia.org",
    "fastly.net",
    "bing.com",
    "icloud.com",
    "domaincontrol.com",
    "l-msedge.net",
    "googleusercontent.com",
    "wordpress.org",
    "root-servers.net",
    "youtu.be",
    "yahoo.com",
    "mail.ru",
    "aaplimg.com",
    "digicert.com",
    "gtld-servers.net",
    "pinterest.com",
    "github.com",
    "ui.com",
    "t-msedge.net",
    "tiktokv.com",
    "windows.net",
    "googlesyndication.com",
    "nflxso.net",
    "adobe.com",
    "sharepoint.com",
    "goo.gl",
    "cloudfront.net",
    "spotify.com",
    "vimeo.com",
    "wordpress.com",
    "gandi.net",
    "google-analytics.com",
    "zoom.us",
    "office.net",
    "bit.ly",
    "gvt2.com",
    "edgekey.net",
    "bytefcdn-oversea.com",
    "skype.com",
    "s-msedge.net",
    "msn.com",
    "whatsapp.net",
    "yandex.net",
    "qq.com",
    "office365.com",
    "mozilla.org",
    "cloudflare.net",
    "whatsapp.com",
    "ntp.org",
    "roblox.com",
    "app-measurement.com",
    "blogspot.com",
    "ytimg.com",
    "tiktok.com",
    "cloudflare-dns.com",
    "googledomains.com",
    "yandex.ru",
    "outlook.com",
    "wac-msedge.net",
    "trbcdn.net",
    "reddit.com",
    "snapchat.com",
    "intuit.com",
    "gvt1.com",
    "opera.com",
    "cdn77.org",
    "netflix.net",
    "tds.net",
    "pki.goog",
    "epicgames.com",
  ];
  const analysisId = (+new Date()).toString();

  await useTwoBrowsers(
    {
      headless: "new", // false
      defaultViewport: { width: 1280, height: 720 },
    },
    async ([browser1, browser2]) => {
      const analysisCode = await new Promise<string>((resolve, reject) => {
        browserify({ basedir: "analysis" })
          .add("./index.js")
          .bundle((err, buf) => {
            if (err) {
              reject(err);
            } else {
              resolve(buf.toString());
            }
          });
      });

      const analysisRunner = new AnalysisRunner(analysisCode);

      const logIfFailure = (analysisResult: AnalysisResult) => {
        if (analysisResult.status === "failure") {
          console.log(analysisResult.reason);
        }
      };
      const castAnalysisResultToJsonSerializable = (
        analysisResult: AnalysisResult
      ): any => {
        if (analysisResult.status === "success") {
          return {
            ...analysisResult,
            featureSet: analysisResult.featureSet.toJsonSerializable(),
          };
        }
        return analysisResult;
      };

      for (const [siteIndex, site] of Object.entries(siteList)) {
        console.log(`begin analysis ${site} [${siteIndex}]`);

        const analysisResult1 = await analysisRunner.runAnalysis(
          browser1,
          site
        );
        logIfFailure(analysisResult1);

        const analysisResult2 = await analysisRunner.runAnalysis(
          browser2,
          site
        );
        logIfFailure(analysisResult2);

        const outDir = join("results", analysisId);
        mkdirSync(outDir, { recursive: true });
        writeFileSync(
          join(outDir, `${site}.json`),
          JSON.stringify({
            site,
            analysisResult1:
              castAnalysisResultToJsonSerializable(analysisResult1),
            analysisResult2:
              castAnalysisResultToJsonSerializable(analysisResult2),
          })
        );

        console.log(`end analysis ${site}`);
      }
    }
  );
};

const useBrowser = async <T>(
  options: PuppeteerLaunchOptions | undefined,
  cb: (browser: Browser) => Promise<T>
) => {
  const browser = await puppeteer.launch(options);
  try {
    return await cb(browser);
  } finally {
    await browser.close();
  }
};

const useTwoBrowsers = async <T>(
  options: PuppeteerLaunchOptions | undefined,
  cb: (browsers: Browser[]) => Promise<T>
) =>
  await useBrowser(
    options,
    async (browser1) =>
      await useBrowser(
        options,
        async (browser2) => await cb([browser1, browser2])
      )
  );

class AnalysisRunner {
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
        if (protocol === "http:" || protocol === "http:") {
          targetSites.add(hostname);
        }
      } finally {
        request.continue();
      }
    });

    try {
      await page.goto(`http://${site}/`, { timeout: 60_000 });
      const pageUrl = page.url();
      const gatheringReport = await timeBomb(
        willReceiveGatheringReport.promise,
        15_000
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

main();
