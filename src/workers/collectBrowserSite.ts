import assert from "assert";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import WPRArchive from "../wprarchive/WPRArchive";
import { addExtra } from "playwright-extra";
import { AnalyzeSyntaxArchive } from "../archive/AnalyzeSyntaxArchive";
import { Browser, Page } from "playwright";
import { BrowserName } from "../collection/BrowserName";
import { ESVersion, lessOrEqualToESVersion } from "../syntax/ESVersion";
import { ForwardProxy } from "../util/ForwardProxy";
import { getBrowserLauncher } from "../collection/getBrowserLauncher";
import { headless } from "../env";
import { isSuccess, toCompletion } from "../util/Completion";
import { MonitorState } from "../collection/MonitorBundle";
import { RecordArchive } from "../archive/RecordArchive";
import { retryOnce } from "../util/retryOnce";
import { SiteResult } from "../archive/Archive";
import { timeBomb } from "../util/timeout";
import { transpile } from "../collection/transpile";
import { unixTime } from "../util/time";
import { useForwardedWebPageReplay } from "../tools/WebPageReplay";
import { usePlaywrightPage } from "../collection/PlaywrightPage";
import { useTransformedWPRArchive } from "../collection/TransformedWPRArchive";
import {
  CollectBrowserArchive,
  CollectBrowserSiteDetail,
  RunDetail,
} from "../archive/CollectBrowserArchive";

export const collectBrowserSiteFilename = __filename;

export interface CollectBrowserSiteArgs {
  site: string;
  browserName: BrowserName;
  archivePath: string;
  analyzeSyntaxArchivePath: string;
  recordArchivePath: string;
  bundlePath: string;
}

export const collectBrowserSite = async (
  args: CollectBrowserSiteArgs
): Promise<void> => {
  const {
    site,
    browserName,
    archivePath,
    analyzeSyntaxArchivePath,
    recordArchivePath,
    bundlePath,
  } = args;

  const archive = CollectBrowserArchive.open(archivePath, true);

  const analyzeSyntaxArchive = AnalyzeSyntaxArchive.open(
    analyzeSyntaxArchivePath
  );
  const analyzeSyntaxSiteResult = analyzeSyntaxArchive.readSiteResult(site);
  assert(isSuccess(analyzeSyntaxSiteResult));
  const { value: syntax } = analyzeSyntaxSiteResult;

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
    const monitorState = (await timeBomb(
      page.evaluate(`$__monitor && $__monitor();`),
      15_000
    )) as MonitorState | undefined;
    assert(monitorState);
    assert(executionTime !== undefined);
    return { monitorState, executionTime };
  };

  const transpileTransform = lessOrEqualToESVersion(
    syntax.minimumESVersion,
    ESVersion.ES5
  )
    ? null
    : (wprArchive: WPRArchive) => transpile(wprArchive, syntax);

  const result = await toCompletion(() =>
    useTransformedWPRArchive(
      recordArchive.getFilePath(`${site}-archive.wprgo`),
      transpileTransform,
      async (wprArchivePath) => {
        const runs: RunDetail[] = [];

        for (let i = 0; i < 5; ++i) {
          const runDetail = await retryOnce(() =>
            useForwardedWebPageReplay(
              {
                operation: "replay",
                archivePath: wprArchivePath,
                injectScripts: [bundlePath],
              },
              (forwardProxy) =>
                usePlaywrightPage(browserFactory(forwardProxy), navigate)
            )
          );

          runs.push(runDetail);
        }

        return {
          transpiled: transpileTransform !== null,
          runs,
        } satisfies CollectBrowserSiteDetail;
      }
    )
  );

  archive.writeSiteResult(
    site,
    result satisfies SiteResult<CollectBrowserSiteDetail>
  );
};
