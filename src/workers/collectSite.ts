import _ from "lodash";
import assert from "assert";
import path from "path";
import TranspileError from "../collection/TranspileError";
import WPRArchive from "../wprarchive/WPRArchive";
import { BrowserOrToolName, isToolName } from "../collection/ToolName";
import { ipRegister } from "../util/interprocess";
import { isSuccess, toCompletion } from "../util/Completion";
import { isSyntacticallyCompatible } from "../collection/isSyntacticallyCompatible";
import { jalangiPath } from "../env";
import { MonitorState } from "../collection/MonitorBundle";
import { Page } from "playwright";
import { PreanalyzeArchive } from "../archive/PreanalyzeArchive";
import { readDirFiles } from "../util/readDirFiles";
import { RecordArchive } from "../archive/RecordArchive";
import { retryOnce } from "../util/retryOnce";
import { SiteResult } from "../archive/Archive";
import { timeBomb } from "../util/timeout";
import { transformWithIFTranspiler } from "../tools/ifTranspiler";
import { transformWithJalangi } from "../tools/jalangi";
import { transformWithJEST } from "../tools/jest";
import { transformWithLinvailTaint } from "../tools/linvailTaint";
import { transpile } from "../collection/transpile";
import { unixTime } from "../util/time";
import { useBrowserOrToolPage } from "../collection/BrowserOrToolPage";
import { useForwardedWebPageReplay } from "../tools/WebPageReplay";
import { useTempDirectory } from "../util/TempDirectory";
import { useTransformedWPRArchive } from "../collection/TransformedWPRArchive";
import {
  ScriptTransformErrorLog,
  WPRArchiveTransformer,
} from "../collection/WPRArchiveTransformer";
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

  const navigate = async (page: Page): Promise<RunDetail> => {
    const startTime = unixTime();
    try {
      await page.goto(accessUrl, { timeout: 120_000 });
    } catch {}
    const executionTime = unixTime() - startTime;
    const monitorState = (await timeBomb(
      () => page.evaluate(`$__monitor()`),
      15_000
    )) as MonitorState | undefined;
    assert(monitorState);
    return { monitorState, executionTime };
  };

  const transpileTransform: WPRArchiveTransformer | null =
    !isSyntacticallyCompatible(
      browserOrToolName,
      preanalyzeReport.minimumESVersion
    )
      ? transpile()
      : null;
  const transpiled = transpileTransform !== null;

  const toolTransform: WPRArchiveTransformer | null = (() => {
    if (toolName === undefined) return null;

    switch (toolName) {
      case "JEST":
        return transformWithJEST();
      case "IF-Transpiler":
        return transformWithIFTranspiler();
      case "LinvailTaint":
        return transformWithLinvailTaint();
      case "JalangiTT":
        return transformWithJalangi(
          path.resolve(jalangiPath, "src", "js", "runtime", "JalangiTT.js")
        );
      case "ProjectFoxhound":
      case "PanoptiChrome":
        return null;
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
      const { newWPRArchive, scriptTransformErrorLogs: scriptTransformLogs } =
        await transpileTransform(transformedWPRArchive, preanalyzeReport);
      if (scriptTransformLogs.length > 0) {
        throw new TranspileError(JSON.stringify(scriptTransformLogs));
      }
      transformedWPRArchive = newWPRArchive;
    }

    let scriptTransformLogs: ScriptTransformErrorLog[] = [];
    if (toolTransform) {
      const {
        newWPRArchive,
        scriptTransformErrorLogs: toolScriptTransformLogs,
      } = await toolTransform(transformedWPRArchive, preanalyzeReport);
      transformedWPRArchive = newWPRArchive;
      scriptTransformLogs = toolScriptTransformLogs;
    }

    let crashRawFlows: string[] = [];

    const runsCompletion = await useTransformedWPRArchive(
      originalWPRArchivePath,
      originalWPRArchive,
      transformedWPRArchive,
      async (wprArchivePath) =>
        toCompletion(async () => {
          const runDetails: RunDetail[] = [];

          for (let i = 0; i < 5; ++i) {
            const runDetail = await retryOnce(() =>
              useForwardedWebPageReplay(
                {
                  operation: "replay",
                  archivePath: wprArchivePath,
                  injectScripts: [bundlePath],
                },
                (forwardProxy) => {
                  if (browserOrToolName === "PanoptiChrome") {
                    return useTempDirectory(async (panoptiChromeLogsPath) => {
                      try {
                        return await useBrowserOrToolPage(
                          browserOrToolName,
                          { forwardProxy, panoptiChromeLogsPath },
                          navigate
                        );
                      } finally {
                        crashRawFlows = [
                          ...crashRawFlows,
                          ...readDirFiles(panoptiChromeLogsPath),
                        ];
                      }
                    });
                  }

                  return useBrowserOrToolPage(
                    browserOrToolName,
                    { forwardProxy },
                    navigate
                  );
                }
              )
            );

            runDetails.push(runDetail);
          }

          return runDetails;
        })
    );

    return {
      transpiled,
      scriptTransformLogs,
      runsCompletion,
      crashRawFlows,
    };
  });

  archive.writeSiteResult(site, result satisfies SiteResult<CollectReport>);
};

ipRegister(collectSite);
