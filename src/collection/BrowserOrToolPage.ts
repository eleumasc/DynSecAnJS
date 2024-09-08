import path from "path";
import { chromium, firefox, Page } from "playwright";
import { ForwardProxy } from "../util/ForwardProxy";
import { headless, projectFoxhoundPath } from "../env";
import { usePlaywrightPage } from "./PlaywrightPage";
import {
  BrowserOrToolName,
  getBrowserNameByToolName,
  isToolName,
} from "./ToolName";

export const useBrowserOrToolPage = async <T>(
  browserOrToolName: BrowserOrToolName,
  forwardProxy: ForwardProxy,
  use: (page: Page) => Promise<T>
): Promise<T> => {
  const browserName = isToolName(browserOrToolName)
    ? getBrowserNameByToolName(browserOrToolName)
    : browserOrToolName;

  const browserLauncher = (() => {
    switch (browserName) {
      case "Chromium-ES5":
        return chromium;
      case "Firefox":
        return firefox;
    }
  })();

  const defaultOpts = {
    headless,
    proxy: {
      server: `${forwardProxy.hostname}:${forwardProxy.port}`,
    },
  };

  const browserFactory = (() => {
    if (browserOrToolName === "ProjectFoxhound") {
      return () =>
        browserLauncher.launch({
          ...defaultOpts,
          executablePath: path.join(projectFoxhoundPath, "foxhound"),
        });
    }

    return () => browserLauncher.launch(defaultOpts);
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
