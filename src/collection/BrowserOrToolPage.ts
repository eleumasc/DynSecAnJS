import assert from "assert";
import path from "path";
import { chromium, firefox, Page } from "playwright";
import { ForwardProxy } from "../util/ForwardProxy";
import { headless, panoptiChromePath, projectFoxhoundPath } from "../env";
import { usePlaywrightPage } from "./PlaywrightPage";
import {
  BrowserOrToolName,
  getBrowserNameByToolName,
  isToolName,
} from "./ToolName";

export const useBrowserOrToolPage = async <T>(
  browserOrToolName: BrowserOrToolName,
  options: {
    forwardProxy?: ForwardProxy;
    panoptiChromeLogsPath?: string;
  },
  use: (page: Page) => Promise<T>
): Promise<T> => {
  const { forwardProxy } = options;

  const browserName = isToolName(browserOrToolName)
    ? getBrowserNameByToolName(browserOrToolName)
    : browserOrToolName;

  const browserLauncher = (() => {
    switch (browserName) {
      case "Chromium":
      case "Chromium-ES5":
        return chromium;
      case "Firefox":
        return firefox;
    }
  })();

  const defaultLaunchOptions = {
    headless,
    ...(forwardProxy
      ? {
          proxy: {
            server: `${forwardProxy.hostname}:${forwardProxy.port}`,
          },
        }
      : {}),
  };

  const browserFactory = (() => {
    if (browserOrToolName === "ProjectFoxhound") {
      return () =>
        browserLauncher.launch({
          ...defaultLaunchOptions,
          executablePath: path.join(projectFoxhoundPath, "foxhound"),
        });
    } else if (browserOrToolName === "PanoptiChrome") {
      const { panoptiChromeLogsPath } = options;
      assert(panoptiChromeLogsPath);
      return () =>
        browserLauncher.launch({
          ...defaultLaunchOptions,
          executablePath: path.join(panoptiChromePath, "chrome"),
          args: [
            "--incognito",
            "--no-sandbox",
            "--no-default-browser-check",
            "--disable-translate",
            "--disable-hang-monitor",
            "--disable-gpu",
            '--js-flags="--jitless"',
            "--disable-client-side-phishing-detection",
            "--disable-extensions",
            "--disable-ipc-flooding-protection",
            "--disable-renderer-backgrounding",
            "--disable-features=BackForwardCache",
            "--disable-breakpad",
            "--disable-component-extensions-with-background-page",
          ],
          env: {
            LOG_DIR: panoptiChromeLogsPath,
          },
        });
    }

    return () => browserLauncher.launch(defaultLaunchOptions);
  })();

  return await usePlaywrightPage(browserFactory, async (page) => {
    if (browserOrToolName === "ProjectFoxhound") {
      await page.addInitScript({
        content: `
function cloneSavedFrame(instance) {
  const {
    asyncCause,
    asyncParent,
    column,
    functionDisplayName,
    line,
    parent,
    source,
    sourceId,
  } = instance;
  return {
    asyncCause,
    asyncParent,
    column,
    functionDisplayName,
    line,
    parent: parent && cloneSavedFrame(parent),
    source,
    sourceId,
  };
}

function cloneTaintReport(instance) {
  const { stack, str } = instance;
  return {
    ...instance,
    stack: cloneSavedFrame(stack),
    taint: str.taint,
  };
}

const taintReports = (window["$__taintReports"] = []);

window.addEventListener("__taintreport", function (r) {
  taintReports[taintReports.length] = cloneTaintReport(r.detail);
});
`,
      });
    }

    return await use(page);
  });
};
