import {
  TransformProvider,
  createExecutionHooksProvider,
  defaultTransformProvider,
  identityTransformProvider,
  scriptInliningTransformProvider,
} from "./ExecutionHooks";
import {
  defaultAnalysisRepeat,
  defaultLoadingTimeoutMs,
  defaultPptrLaunchOptions,
} from "../core/defaults";
import { headless, jalangiPath, projectFoxhoundPath } from "../core/env";

import { Agent } from "./Agent";
import { Browser } from "selenium-webdriver";
import { DefaultToolAnalysis } from "./DefaultToolAnalysis";
import { ESVersion } from "../compatibility/ESVersion";
import { PuppeteerAgent } from "./PuppeteerAgent";
import { SeleniumAgent } from "./SeleniumAgent";
import { ToolAnalysis } from "./ToolAnalysis";
import path from "path";
import { transformWithGIFC } from "../tools/gifc";
import { transformWithIFTranspiler } from "../tools/ifTranspiler";
import { transformWithJEST } from "../tools/jest";
import { transformWithJalangi } from "../tools/jalangi";

export const getToolAnalysis = (
  toolName: string,
  preAnalysis: boolean
): ToolAnalysis => {
  interface DefaultAnalysisOptions {
    agent: Agent;
    transformProvider: TransformProvider;
    supportedESVersion: ESVersion;
  }

  const getDefaultAnalysis = (
    options: DefaultAnalysisOptions
  ): ToolAnalysis => {
    const { agent, transformProvider, supportedESVersion } = options;
    const analysisRepeat = preAnalysis ? 1 : defaultAnalysisRepeat;
    const loadingTimeoutMs = preAnalysis ? 5 * 60_000 : defaultLoadingTimeoutMs;

    return new DefaultToolAnalysis(agent, {
      toolName,
      executionHooksProvider: createExecutionHooksProvider(transformProvider),
      supportedESVersion,
      analysisRepeat,
      loadingTimeoutMs,
    });
  };

  switch (toolName) {
    case "ProjectFoxhound":
      return getDefaultAnalysis({
        agent: new SeleniumAgent({
          webDriverOptions: {
            browser: Browser.FIREFOX,
            binaryPath: path.join(projectFoxhoundPath, "foxhound"),
            args: [],
            headless,
          },
        }),
        transformProvider: identityTransformProvider(),
        supportedESVersion: ESVersion.ES2022,
      });

    case "JEST":
      return getDefaultAnalysis({
        agent: new PuppeteerAgent({
          pptrLaunchOptions: defaultPptrLaunchOptions,
        }),
        transformProvider: scriptInliningTransformProvider(transformWithJEST()),
        supportedESVersion: ESVersion.ES5,
      });

    case "IFTranspiler":
      return getDefaultAnalysis({
        agent: new PuppeteerAgent({
          pptrLaunchOptions: defaultPptrLaunchOptions,
        }),
        transformProvider: defaultTransformProvider(
          transformWithIFTranspiler()
        ),
        supportedESVersion: ESVersion.ES5,
      });

    case "GIFC":
      return getDefaultAnalysis({
        agent: new PuppeteerAgent({
          pptrLaunchOptions: defaultPptrLaunchOptions,
        }),
        transformProvider: defaultTransformProvider(transformWithGIFC()),
        supportedESVersion: ESVersion.ES2018,
      });

    case "JalangiTT":
      return getDefaultAnalysis({
        agent: new PuppeteerAgent({
          pptrLaunchOptions: defaultPptrLaunchOptions,
        }),
        transformProvider: defaultTransformProvider(
          transformWithJalangi(
            path.join(jalangiPath, "src", "js", "runtime", "JalangiTT.js")
          )
        ),
        supportedESVersion: ESVersion.ES5,
      });

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
