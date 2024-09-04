import _ from "lodash";
import assert from "assert";
import path from "path";
import WPRArchive from "../wprarchive/WPRArchive";
import { Browser, Page } from "playwright";
import { ESVersion, lessOrEqualToESVersion } from "../syntax/ESVersion";
import { Failure, isSuccess, toCompletion } from "../util/Completion";
import { ForwardProxy } from "../util/ForwardProxy";
import { getBrowserLauncher } from "../collection/getBrowserLauncher";
import { headless, jalangiPath } from "../env";
import { ipRegister } from "../util/interprocess";
import { isBrowserName } from "../collection/BrowserName";
import { MonitorState } from "../collection/MonitorBundle";
import { PreanalyzeArchive } from "../archive/PreanalyzeArchive";
import { RecordArchive } from "../archive/RecordArchive";
import { retryOnce } from "../util/retryOnce";
import { SiteResult } from "../archive/Archive";
import { timeBomb } from "../util/timeout";
import { transformWithJalangi } from "../tools/jalangi";
import { transpile } from "../collection/transpile";
import { unixTime } from "../util/time";
import { useForwardedWebPageReplay } from "../tools/WebPageReplay";
import { usePlaywrightPage } from "../collection/PlaywrightPage";
import { useTransformedWPRArchive } from "../collection/TransformedWPRArchive";
import { WPRArchiveTransformer } from "../collection/WPRArchiveTransformer";
import {
  BrowserOrToolName,
  getBrowserNameByToolName,
  isToolName,
} from "../collection/ToolName";
import {
  CollectArchive,
  CollectReport,
  RunDetail,
} from "../archive/CollectArchive";

export interface CollectSiteArgs {
  site: string;
  browserOrToolName: BrowserOrToolName;
  archivePath: string;
  preanalyzeArchivePath: string;
  recordArchivePath: string;
  bundlePath: string;
}

export const collectSiteFilename = __filename;

const collectSite = async (args: CollectSiteArgs): Promise<void> => {
  const {
    site,
    browserOrToolName,
    archivePath,
    preanalyzeArchivePath,
    recordArchivePath,
    bundlePath,
  } = args;
  const browserName = isBrowserName(browserOrToolName)
    ? browserOrToolName
    : getBrowserNameByToolName(browserOrToolName);
  const toolName = isToolName(browserOrToolName)
    ? browserOrToolName
    : undefined;

  const archive = CollectArchive.open(archivePath, true);

  const preanalyzeArchive = PreanalyzeArchive.open(preanalyzeArchivePath);
  const preanalyzeSiteResult = preanalyzeArchive.readSiteResult(site);
  assert(isSuccess(preanalyzeSiteResult));
  const { value: preanalyzeReport } = preanalyzeSiteResult;

  const recordArchive = RecordArchive.open(recordArchivePath);
  const recordSiteResult = recordArchive.readSiteResult(site);
  assert(isSuccess(recordSiteResult));
  const {
    value: { accessUrl },
  } = recordSiteResult;

  const browserFactory = (forwardProxy: ForwardProxy) => (): Promise<Browser> =>
    getBrowserLauncher(browserName).launch({
      headless,
      proxy: {
        server: `${forwardProxy.hostname}:${forwardProxy.port}`,
      },
    });

  const navigate = async (page: Page): Promise<RunDetail> => {
    const startTime = unixTime();
    try {
      await page.goto(accessUrl, { timeout: 120_000 });
    } catch {}
    const executionTime = unixTime() - startTime;
    const monitorState = (await timeBomb(
      page.evaluate(`$__monitor()`),
      15_000
    )) as MonitorState | undefined;
    assert(monitorState);
    return { monitorState, executionTime };
  };

  const transpileTransform: WPRArchiveTransformer | null = (() => {
    switch (browserName) {
      case "Chromium-ES5":
        return lessOrEqualToESVersion(
          preanalyzeReport.minimumESVersion,
          ESVersion.ES5
        )
          ? null
          : transpile();
      case "Firefox":
        return null;
    }
  })();
  const transpiled = transpileTransform !== null;

  const toolTransform: WPRArchiveTransformer | null = (() => {
    if (toolName === undefined) return null;

    switch (toolName) {
      case "JalangiTT":
        return transformWithJalangi(
          path.resolve(jalangiPath, "src", "js", "runtime", "JalangiTT.js")
        );
      default:
        throw new Error(`Unsupported tool for transform: ${toolName}`);
    }
  })();

  const result = await toCompletion(async (): Promise<CollectReport> => {
    const originalWPRArchivePath = recordArchive.getFilePath(
      `${site}-archive.wprgo`
    );
    const originalWPRArchive = WPRArchive.fromFile(originalWPRArchivePath);

    let transformedWPRArchive = originalWPRArchive;

    if (transpileTransform) {
      const transpileTransformResult = await transpileTransform(
        transformedWPRArchive,
        preanalyzeReport
      );
      if (transpileTransformResult.status === "success") {
        transformedWPRArchive = transpileTransformResult.transformedWPRArchive;
      } else {
        throw new Error(
          "transpileTransform failure:\n" +
            transpileTransformResult.transformErrors.join("\n")
        );
      }
    }

    if (toolTransform) {
      const toolTransformResult = await toolTransform(
        transformedWPRArchive,
        preanalyzeReport
      );
      if (toolTransformResult.status === "success") {
        transformedWPRArchive = toolTransformResult.transformedWPRArchive;
      } else {
        return {
          transpiled,
          transformErrors: toolTransformResult.transformErrors,
          runsCompletion: Failure("transformErrors is non-empty"),
        };
      }
    }

    const runsCompletion = await useTransformedWPRArchive(
      originalWPRArchivePath,
      originalWPRArchive,
      transformedWPRArchive,
      async (wprArchivePath) =>
        toCompletion(async () => {
          const runs: RunDetail[] = [];

          for (let i = 0; i < 5; ++i) {
            const run = await retryOnce(() =>
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

            runs.push(run);
          }

          return runs;
        })
    );

    return {
      transpiled,
      transformErrors: [],
      runsCompletion,
    };
  });

  archive.writeSiteResult(site, result satisfies SiteResult<CollectReport>);
};

ipRegister(collectSite);
