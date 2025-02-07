import assert from "assert";
import Deferred from "../util/Deferred";
import path from "path";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
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
import { ipRegister } from "../util/interprocess";
import { RecordArchive, RecordReport } from "../archive/RecordArchive";
import { retryOnce } from "../util/retryOnce";
import { SiteResult } from "../archive/Archive";
import { toCompletion } from "../util/Completion";
import { useForwardedWebPageReplay } from "../tools/WebPageReplay";
import { usePlaywrightPage } from "../collection/PlaywrightPage";
import { useTempDirectory } from "../util/TempDirectory";

export interface RecordSiteArgs {
  site: string;
  archivePath: string;
}

export const recordSiteFilename = __filename;

const recordSite = async (args: RecordSiteArgs): Promise<void> => {
  const { site, archivePath } = args;
  const archive = RecordArchive.open(archivePath, true);

  const navigate = async (page: Page): Promise<RecordReport> => {
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

    const storageState = await page.context().storageState();

    return { accessUrl, storageState };
  };

  const browserFactory = (forwardProxy: ForwardProxy) => (): Promise<Browser> =>
    addExtra(chromium)
      .use(StealthPlugin())
      .launch({
        headless,
        proxy: {
          server: `${forwardProxy.hostname}:${forwardProxy.port}`,
        },
      });

  const result = await toCompletion(() =>
    retryOnce(() =>
      useTempDirectory(async (tempPath) => {
        const wprArchiveTempPath = path.join(tempPath, "archive.wprgo");

        const result = await useForwardedWebPageReplay(
          {
            operation: "record",
            archivePath: wprArchiveTempPath,
          },
          (forwardProxy) =>
            usePlaywrightPage(browserFactory(forwardProxy), navigate)
        );

        archive.moveFile(`${site}-archive.wprgo`, wprArchiveTempPath);

        return result;
      })
    )
  );

  archive.writeSiteResult(site, result satisfies SiteResult<RecordReport>);
};

ipRegister(recordSite);
