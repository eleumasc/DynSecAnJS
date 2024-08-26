import {
  ChildInitCommandController,
  initCommand,
} from "../archive/initCommand";
import { Args } from "../archive/Args";
import { callAgent, registerAgent } from "../util/thread";

import { AnalyzeSyntaxArchive } from "../archive/AnalyzeSyntaxArchive";
import { RecordArchive } from "../archive/RecordArchive";
import {
  ArchiveProcessSitesController,
  processSites,
} from "../util/processSites";
import { isSuccess, toCompletion } from "../util/Completion";
import {
  CollectBrowserArchive,
  CollectBrowserLogfile,
  CollectBrowserSiteDetail,
  RunDetail,
} from "../archive/CollectBrowserArchive";
import { getBrowserLauncher } from "../collection/getBrowserLauncher";
import { BrowserName } from "../collection/BrowserName";
import { SiteResult } from "../archive/Archive";
import { useForwardedWebPageReplay } from "../tools/WebPageReplay";
import { usePlaywrightPage } from "../collection/PlaywrightPage";
import { ForwardProxy } from "../util/ForwardProxy";
import { Browser, Page } from "playwright";
import { addExtra } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { headless } from "../env";
import assert from "assert";
import { timeBomb } from "../util/timeout";
import { unixTime } from "../util/time";
import { ProbesState, useProbesBundle } from "../collection/useProbesBundle";
import { retryOnce } from "../util/retryOnce";

export type CollectBrowserArgs = Args<
  {
    browserName: BrowserName;
    analyzeSyntaxArchivePath: string;
  },
  {
    concurrencyLimit: number;
  }
>;

export const cmdCollectBrowser = async (args: CollectBrowserArgs) => {
  const {
    archive,
    processArgs: { concurrencyLimit },
    resolveArchivePath,
  } = initCommand(
    args,
    CollectBrowserArchive,
    new ChildInitCommandController(
      AnalyzeSyntaxArchive,
      (requireArgs) => requireArgs.analyzeSyntaxArchivePath,
      (requireArgs) => `CollectBrowser-${requireArgs.browserName}`,
      (
        requireArgs,
        { parentArchiveName, sitesState }
      ): CollectBrowserLogfile => {
        return {
          type: "CollectBrowserLogfile",
          browserName: requireArgs.browserName,
          analyzeSyntaxArchiveName: parentArchiveName,
          sitesState,
        };
      }
    )
  );

  const analyzeSyntaxArchive = AnalyzeSyntaxArchive.open(
    resolveArchivePath(archive.logfile.analyzeSyntaxArchiveName)
  );
  const recordArchive = RecordArchive.open(
    resolveArchivePath(analyzeSyntaxArchive.logfile.recordArchiveName)
  );

  await useProbesBundle({}, async (bundlePath) =>
    processSites(
      new ArchiveProcessSitesController(archive),
      concurrencyLimit,
      async (site) => {
        const { archivePath } = archive;
        await callAgent(__filename, collectBrowserSite.name, {
          site,
          browserName: archive.logfile.browserName,
          archivePath,
          analyzeSyntaxArchivePath: analyzeSyntaxArchive.archivePath,
          recordArchivePath: recordArchive.archivePath,
          bundlePath,
        } satisfies CollectBrowserSiteArgs);
      }
    )
  );
};

interface CollectBrowserSiteArgs {
  site: string;
  browserName: BrowserName;
  archivePath: string;
  analyzeSyntaxArchivePath: string;
  recordArchivePath: string;
  bundlePath: string;
}

const collectBrowserSite = async (
  args: CollectBrowserSiteArgs
): Promise<void> => {
  const { site, browserName, archivePath, recordArchivePath, bundlePath } =
    args;

  const archive = CollectBrowserArchive.open(archivePath, true);

  const recordArchive = RecordArchive.open(recordArchivePath);
  const recordSiteResult = recordArchive.readSiteResult(site);
  assert(isSuccess(recordSiteResult));
  const {
    value: { accessUrl },
  } = recordSiteResult;

  const browserFactory = (forwardProxy: ForwardProxy) => (): Promise<Browser> =>
    addExtra(getBrowserLauncher(browserName))
      .use(StealthPlugin())
      .launch({
        headless,
        proxy: {
          server: `${forwardProxy.hostname}:${forwardProxy.port}`,
        },
      });

  const navigate = async (page: Page): Promise<RunDetail> => {
    const startTime = unixTime();
    let executionTime;
    try {
      await page.goto(accessUrl, { timeout: 120_000 });
      executionTime = unixTime() - startTime;
    } catch {}
    const probesState = (await timeBomb(
      page.evaluate(`$__probes && $__probes();`),
      15_000
    )) as ProbesState | undefined;
    assert(probesState);
    assert(executionTime !== undefined);
    return { probesState, executionTime };
  };

  const result = await toCompletion(async () => {
    const runs: RunDetail[] = [];

    for (let i = 0; i < 5; ++i) {
      const runDetail = await retryOnce(() =>
        useForwardedWebPageReplay(
          {
            operation: "replay",
            archivePath: recordArchive.getFilePath(`${site}-archive.wprgo`),
            injectScripts: [bundlePath],
          },
          (forwardProxy) =>
            usePlaywrightPage(browserFactory(forwardProxy), navigate)
        )
      );

      runs.push(runDetail);
    }

    return { runs };
  });

  archive.writeSiteResult(
    site,
    result satisfies SiteResult<CollectBrowserSiteDetail>
  );
};

registerAgent(() => [
  { name: collectBrowserSite.name, fn: collectBrowserSite },
]);
