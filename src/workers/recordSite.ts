import assert from "assert";
import Deferred from "../util/Deferred";
import path from "path";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import workerpool from "workerpool";
import { addExtra } from "playwright-extra";
import {
  Browser,
  chromium,
  Page,
  Request
  } from "playwright";
import { delay } from "../util/timeout";
import { ForwardProxy } from "../util/ForwardProxy";
import { headless } from "../env";
import { isSuccess, toCompletion } from "../util/Completion";
import { RecordArchive, RecordSiteDetail } from "../archive/RecordArchive";
import { retryOnceCompletion } from "../util/retryOnce";
import { SiteResult } from "../archive/Archive";
import { useForwardedWebPageReplay } from "../tools/WebPageReplay";
import { usePlaywrightPage } from "../collection/PlaywrightPage";
import { useTempDirectory } from "../util/TempDirectory";

export interface RecordSiteArgs {
  site: string;
  archivePath: string;
}

const recordSite = async (args: RecordSiteArgs): Promise<void> => {
  const { site, archivePath } = args;
  const archive = RecordArchive.open(archivePath, true);

  const browserFactory = (forwardProxy: ForwardProxy) => (): Promise<Browser> =>
    addExtra(chromium)
      .use(StealthPlugin())
      .launch({
        headless,
        proxy: {
          server: `${forwardProxy.hostname}:${forwardProxy.port}`,
        },
      });

  const navigate = async (page: Page): Promise<RecordSiteDetail> => {
    interface ScriptRequestLoadingQueueEntry {
      request: Request;
      deferredComplete: Deferred<void>;
    }
    const scriptRequestLoadingQueue: ScriptRequestLoadingQueueEntry[] = [];
    let scriptRequestTick: number = 0;
    page.on("request", (request) => {
      if (request.resourceType() !== "script") return;
      scriptRequestLoadingQueue.push({
        request,
        deferredComplete: new Deferred(),
      });
      scriptRequestTick = 0;
    });
    const handleRequestFinished = (request: Request) => {
      if (request.resourceType() !== "script") return;
      const entry = scriptRequestLoadingQueue.find(
        (entry) => entry.request === request
      );
      assert(entry);
      entry.deferredComplete.resolve();
    };
    page.on("requestfinished", handleRequestFinished);
    page.on("requestfailed", handleRequestFinished);

    const accessUrl = `http://${site}/`;
    await page.goto(accessUrl, { timeout: 60_000 });

    for (; scriptRequestTick < 5; ++scriptRequestTick) {
      await delay(1_000);
    }
    for (const entry of scriptRequestLoadingQueue) {
      await entry.deferredComplete.promise;
    }

    return {
      accessUrl,
      scriptUrls: scriptRequestLoadingQueue.map((entry) => entry.request.url()),
    };
  };

  const result = await retryOnceCompletion(() =>
    useTempDirectory(async (tempPath) => {
      const wprArchiveTempPath = path.join(tempPath, "archive.wprgo");

      const result = await toCompletion(() =>
        useForwardedWebPageReplay(
          {
            operation: "record",
            archivePath: wprArchiveTempPath,
          },
          (forwardProxy) =>
            usePlaywrightPage(browserFactory(forwardProxy), navigate)
        )
      );

      if (isSuccess(result)) {
        archive.moveFile(`${site}-archive.wprgo`, wprArchiveTempPath);
      }

      return result;
    })
  );

  archive.writeSiteResult(site, result satisfies SiteResult<RecordSiteDetail>);
};

workerpool.worker({
  recordSite,
});
