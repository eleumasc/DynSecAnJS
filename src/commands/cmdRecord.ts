import { Browser, Page, Request, chromium } from "playwright";
import {
  RecordLogfile,
  RecordSiteResult,
  RecordSiteDetail,
} from "../archive/RecordLogfile";
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
import { processEachSite } from "../util/processEachSite";
import { readSitelistFromFile } from "../util/Sitelist";
import { retryOnce } from "../util/retryOnce";
import { useForwardedWebPageReplay } from "../tools/WebPageReplay";
import { usePlaywrightPage } from "../util/PlaywrightPage";
import { useTempDirectory } from "../util/TempDirectory";
import { delay } from "../util/timeout";
import { Args, initCommand } from "../archive/initCommand";

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
    deps: { sitelist },
    processArgs: { concurrencyLimit },
  } = initCommand<RecordLogfile>()(
    args,
    (depsArgs) => path.resolve(depsArgs.workingDirectory, "Record"),
    () => {
      return { type: "RecordLogfile", sites: [] };
    },
    (depsArgs) => {
      const sitelist = readSitelistFromFile(depsArgs.sitelistPath);
      return { sitelist };
    }
  );

  console.log(`${sitelist.length} sites`);

  await processEachSite(
    {
      getSites() {
        return sitelist;
      },
      getProcessedSites() {
        return archive.logfile.sites;
      },
      onSiteProcessed(site) {
        const { logfile } = archive;
        archive.logfile = {
          ...logfile,
          sites: [...logfile.sites, site],
        };
      },
    },
    concurrencyLimit,
    async (site) => {
      const { archivePath } = archive;
      await callAgent(__filename, recordSite.name, {
        site,
        archivePath,
      } satisfies RecordSiteArgs);
    }
  );
};

interface RecordSiteArgs {
  site: string;
  archivePath: string;
}

const recordSite = async (args: RecordSiteArgs): Promise<void> => {
  const { site, archivePath } = args;
  const archive = Archive.open<RecordLogfile>(archivePath, true);

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

  const result: RecordSiteResult = await retryOnce(() =>
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

  archive.writeData(`${site}.json`, result);
};

registerAgent(() => [{ name: recordSite.name, fn: recordSite }]);
