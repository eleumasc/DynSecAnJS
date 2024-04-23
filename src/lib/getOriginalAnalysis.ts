import {
  createExecutionHooksProvider,
  identityTransformProvider,
} from "./ExecutionHooks";
import {
  defaultAnalysisRepeat,
  defaultLoadingTimeoutMs,
  defaultPptrLaunchOptions,
} from "../core/defaults";
import { firefoxPath, headless } from "../core/env";

import { Agent } from "./Agent";
import { Browser } from "selenium-webdriver";
import { DefaultOriginalAnalysis } from "./DefaultOriginalAnalysis";
import { OriginalAnalysis } from "./OriginalAnalysis";
import { PuppeteerAgent } from "./PuppeteerAgent";
import { SeleniumAgent } from "./SeleniumAgent";
import { createCompatibilityHooksProvider } from "./CompatibilityHooks";
import path from "path";

export const getOriginalAnalysis = (browserName: string): OriginalAnalysis => {
  interface DefaultAnalysisOptions {
    agent: Agent;
  }

  const getDefaultAnalysis = (
    options: DefaultAnalysisOptions
  ): OriginalAnalysis => {
    const { agent } = options;
    const analysisRepeat = defaultAnalysisRepeat;
    const loadingTimeoutMs = defaultLoadingTimeoutMs;

    return new DefaultOriginalAnalysis(agent, {
      compatibilityHooksProvider: createCompatibilityHooksProvider(),
      executionHooksProvider: createExecutionHooksProvider(
        identityTransformProvider()
      ),
      analysisRepeat,
      loadingTimeoutMs,
    });
  };

  switch (browserName) {
    case "Chrome":
      return getDefaultAnalysis({
        agent: new PuppeteerAgent({
          pptrLaunchOptions: defaultPptrLaunchOptions,
        }),
      });

    case "Firefox":
      return getDefaultAnalysis({
        agent: new SeleniumAgent({
          webDriverOptions: {
            browser: Browser.FIREFOX,
            binaryPath: path.join(firefoxPath, "firefox"),
            args: [],
            headless,
          },
        }),
      });

    default:
      throw new Error(`Unknown browser: ${browserName}`);
  }
};
