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
import { retryOnce } from "../util/retryOnce";
import { typenameRecordLogfile } from "../archive/typenameLogfile";
import { unixTime } from "../util/time";
import { useForwardedWebPageReplay } from "../tools/WebPageReplay";
import { usePlaywrightPage } from "../util/PlaywrightPage";
import { useTempDirectory } from "../util/TempDirectory";
import { delay } from "../util/timeout";

export interface BaseRecordArgs {
  concurrencyLimit: number;
}

export interface DefaultRecordArgs extends BaseRecordArgs {
  sitelistPath: string;
  workingDirectory: string;
}

export interface ResumeRecordArgs extends BaseRecordArgs {
  archivePath: string;
}

export type RecordArgs = DefaultRecordArgs | ResumeRecordArgs;

export const cmdRecord = async (args: RecordArgs) => {
  const { concurrencyLimit } = args;

  const archive = (() => {
    if ("sitelistPath" in args) {
      const { sitelistPath, workingDirectory } = args;

      const creationTime = unixTime();
      const archivePath = path.join(workingDirectory, `${creationTime}-Record`);

      return Archive.init(
        archivePath,
        typenameRecordLogfile,
        creationTime,
        readSitelistFromFile(sitelistPath)
      );
    } else {
      const { archivePath } = args;

      const archive = Archive.open(path.resolve(archivePath), true);
      assert(archive.logfile.type === typenameRecordLogfile);
      return archive;
    }
  })();

  console.log(`Archive path: ${archive.archivePath}`);
  console.log(`${archive.logfile.todoSites.length} sites`);

  await processEachSiteInArchive(archive, concurrencyLimit, async (site) => {
    const args: RecordSiteArgs = { site, archivePath: archive.archivePath };
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

  const result = await retryOnce(() =>
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

  archive.writeData(`${site}.json`, result satisfies RecordSiteResult);
};

registerAgent(() => [{ name: recordSite.name, fn: recordSite }]);
