import { Browser, Page, Request, chromium } from "playwright";
import {
  RecordSiteResult,
  RecordedSiteInfo,
} from "../archive/RecordSiteResult";
import { callAgent, registerAgent } from "../util/thread";
import { isSuccess, toCompletion } from "../util/Completion";

import Archive from "../archive/Archive";
import Deferred from "../core/Deferred";
import { ForwardProxy } from "../util/ForwardProxy";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { addExtra } from "playwright-extra";
import assert from "assert";
import { headless } from "../env";
import path from "path";
import { processEachSiteInArchive } from "../util/processEachSiteInArchive";
import { readSitelistFromFile } from "../util/Sitelist";
import { unixTime } from "../util/time";
import { useForwardedWebPageReplay } from "../tools/WebPageReplay";
import { usePlaywrightPage } from "../util/PlaywrightPage";
import { useTempDirectory } from "../util/TempDirectory";

export interface RecordArgs {
  sitelistPath: string;
  concurrencyLimit: number;
  workingDirectory: string;
}

export const cmdRecord = async (args: RecordArgs) => {
  const { sitelistPath, concurrencyLimit, workingDirectory } = args;

  const creationTime = unixTime();
  const archivePath = path.join(workingDirectory, `${creationTime}-Record`);
  console.log(`Archive path: ${archivePath}`);

  const archive = Archive.init(
    archivePath,
    "RecordLogfile",
    creationTime,
    readSitelistFromFile(sitelistPath)
  );
  console.log(`${archive.logfile.todoSites.length} sites`);

  await processEachSiteInArchive(archive, concurrencyLimit, async (site) => {
    const args: RecordSiteArgs = { site, archivePath };
    await callAgent(__filename, recordSite.name, args);
  });
};

interface RecordSiteArgs {
  site: string;
  archivePath: string;
}

const recordSite = async (args: RecordSiteArgs): Promise<void> => {
  const { site, archivePath } = args;
  const archive = Archive.open(archivePath, true);

  const browserFactory = (forwardProxy: ForwardProxy) => (): Promise<Browser> =>
    addExtra(chromium)
      .use(StealthPlugin())
      .launch({
        headless,
        proxy: {
          server: `${forwardProxy.hostname}:${forwardProxy.port}`,
        },
      });

  const navigate = async (page: Page): Promise<RecordedSiteInfo> => {
    interface ScriptRequestLoadingQueueEntry {
      request: Request;
      deferredComplete: Deferred<void>;
    }
    const scriptRequestLoadingQueue: ScriptRequestLoadingQueueEntry[] = [];
    page.on("request", (request) => {
      if (request.resourceType() !== "script") return;
      scriptRequestLoadingQueue.push({
        request,
        deferredComplete: new Deferred(),
      });
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

    for (const entry of scriptRequestLoadingQueue) {
      await entry.deferredComplete.promise;
    }

    return {
      accessUrl,
      scriptUrls: scriptRequestLoadingQueue.map((entry) => entry.request.url()),
    };
  };

  await useTempDirectory(async (tempPath) => {
    const wprArchiveTempPath = path.join(tempPath, "archive.wprgo");

    const result = (await useForwardedWebPageReplay(
      {
        operation: "record",
        archivePath: wprArchiveTempPath,
      },
      (forwardProxy) =>
        usePlaywrightPage(browserFactory(forwardProxy), (page) =>
          toCompletion(() => navigate(page))
        )
    )) as RecordSiteResult;

    archive.writeData(`${site}.json`, result);

    if (isSuccess(result)) {
      archive.moveFile(`${site}-archive.wprgo`, wprArchiveTempPath);
    }
  });
};

registerAgent(() => [{ name: recordSite.name, fn: recordSite }]);
