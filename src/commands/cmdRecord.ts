import { Browser, Page, Request, chromium } from "playwright";
import { RecordArchive, RecordSiteDetail } from "../archive/RecordArchive";
import { callAgent, registerAgent } from "../util/thread";
import { isSuccess, toCompletion } from "../util/Completion";

import { SiteResult } from "../archive/Archive";
import Deferred from "../core/Deferred";
import { ForwardProxy } from "../util/ForwardProxy";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { addExtra } from "playwright-extra";
import assert from "assert";
import { headless } from "../env";
import path from "path";
import {
  ArchiveProcessSitesController,
  processSites,
} from "../util/processSites";
import { createSitesState } from "../archive/SitesState";
import { readSitelistFromFile } from "../util/Sitelist";
import { retryOnce, retryOnceCompletion } from "../util/retryOnce";
import { useForwardedWebPageReplay } from "../tools/WebPageReplay";
import { usePlaywrightPage } from "../collection/PlaywrightPage";
import { useTempDirectory } from "../util/TempDirectory";
import { delay } from "../util/timeout";
import { initCommand } from "../archive/initCommand";
import { Args } from "../archive/Args";

export type RecordArgs = Args<
  {
    sitelistPath: string;
    workingDirectory: string;
  },
  {
    concurrencyLimit: number;
  }
>;

export const cmdRecord = async (args: RecordArgs) => {
  const {
    archive,
    processArgs: { concurrencyLimit },
  } = initCommand(args, RecordArchive, {
    getPrefix(requireArgs) {
      return path.resolve(requireArgs.workingDirectory, "Record");
    },
    createLogfile(requireArgs) {
      const sitelist = readSitelistFromFile(requireArgs.sitelistPath);
      return {
        type: "RecordLogfile",
        sitesState: createSitesState(sitelist),
      };
    },
  });

  console.log(`${Object.entries(archive.logfile.sitesState).length} sites`);

  await processSites(
    new ArchiveProcessSitesController(archive),
    concurrencyLimit,
    async (site) => {
      const { archivePath } = archive;
      await retryOnce(() =>
        callAgent(__filename, recordSite.name, {
          site,
          archivePath,
        } satisfies RecordSiteArgs)
      );
    }
  );
};

interface RecordSiteArgs {
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

registerAgent(() => [{ name: recordSite.name, fn: recordSite }]);
