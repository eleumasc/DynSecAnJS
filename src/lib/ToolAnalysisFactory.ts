import {
  BodyTransformer,
  createExecutionHooksProvider,
} from "./ExecutionHooks";
import {
  defaultAnalysisRepeat,
  defaultFaultAwarenessDeltaMs,
  defaultLoadingTimeoutMs,
  defaultPptrLaunchOptions,
} from "../core/defaults";
import { headless, projectFoxhoundPath } from "../core/env";

import { AgentFactory } from "./Agent";
import { Browser } from "selenium-webdriver";
import { DefaultToolAnalysis } from "./DefaultToolAnalysis";
import { ESVersion } from "../compatibility/ESVersion";
import FaultAwareAgent from "./FaultAwareAgent";
import { PuppeteerAgent } from "./PuppeteerAgent";
import { SeleniumAgent } from "./SeleniumAgent";
import { ToolAnalysis } from "./ToolAnalysis";
import { identifyBodyTransformer } from "../tools/util";
import path from "path";
import { transformWithAranLinvail } from "../tools/aranLinvail";
import { transformWithIFTranspiler } from "../tools/ifTranspiler";
import { transformWithJEST } from "../tools/jest";
import { transformWithJalangi } from "../tools/jalangi";

export type ToolAnalysisFactory = () => ToolAnalysis;

export const getToolAnalysisFactory = (
  toolName: string,
  preAnalysis: boolean
): ToolAnalysisFactory => {
  interface DefaultFactoryOptions {
    agentFactory: AgentFactory;
    bodyTransformer?: BodyTransformer;
    supportedESVersion: ESVersion;
  }

  const getDefaultFactory =
    (options: DefaultFactoryOptions): ToolAnalysisFactory =>
    () => {
      const { agentFactory, bodyTransformer, supportedESVersion } = options;
      const analysisRepeat = preAnalysis ? 1 : defaultAnalysisRepeat;
      const loadingTimeoutMs = preAnalysis
        ? 5 * 60_000
        : defaultLoadingTimeoutMs;
      const faultAwarenessTimeoutMs =
        loadingTimeoutMs + defaultFaultAwarenessDeltaMs;

      return new DefaultToolAnalysis(
        new FaultAwareAgent(faultAwarenessTimeoutMs, agentFactory),
        {
          toolName,
          executionHooksProvider: createExecutionHooksProvider(
            bodyTransformer &&
              identifyBodyTransformer(toolName, bodyTransformer)
          ),
          supportedESVersion,
          analysisRepeat,
          loadingTimeoutMs,
        }
      );
    };

  switch (toolName) {
    // case "ChromiumTaintTracking":
    //   return getDefaultFactory({
    //     agentFactory: async () =>
    //       await SeleniumAgent.create({
    //         webDriverOptions: {
    //           browser: Browser.CHROME,
    //           server: "http://192.168.42.2:9515/wd/hub",
    //           binaryPath:
    //             "/home/user/Documents/chromium_taint_tracking/src/out/Debug/chrome",
    //           args: [
    //             '--js-flags="--taint_log_file=/home/user/logfiles/logfile.txt --no-crankshaft --no-turbo --no-ignition"',
    //             "--no-sandbox",
    //             "--disable-hang-monitor",
    //           ],
    //           headless,
    //         },
    //         localHost: "192.168.42.1",
    //       }),
    //     supportedESVersion: ESVersion.ES2016,
    //   });

    // case "JSFlow":
    //   return getDefaultFactory({
    //     agentFactory: async () =>
    //       await SeleniumAgent.create({
    //         webDriverOptions: {
    //           browser: Browser.CHROME,
    //           server: "http://192.168.42.3:9515/wd/hub",
    //           binaryPath: "/home/essentialfp/chromium/src/out/Default/chrome",
    //           args: ["--no-sandbox", "--disable-hang-monitor"],
    //           headless,
    //         },
    //         localHost: "192.168.42.1",
    //       }),
    //     supportedESVersion: ESVersion.ES2018,
    //   });

    case "ProjectFoxhound":
      return getDefaultFactory({
        agentFactory: async () =>
          await SeleniumAgent.create({
            webDriverOptions: {
              browser: Browser.FIREFOX,
              binaryPath: path.join(projectFoxhoundPath, "foxhound"),
              args: [],
              headless,
            },
            localHost: "127.0.0.1",
          }),
        supportedESVersion: ESVersion.ES2022,
      });

    case "JEST":
      return getDefaultFactory({
        agentFactory: async () =>
          await PuppeteerAgent.create({
            pptrLaunchOptions: defaultPptrLaunchOptions,
          }),
        bodyTransformer: transformWithJEST(),
        supportedESVersion: ESVersion.ES5,
      });

    case "IFTranspiler":
      return getDefaultFactory({
        agentFactory: async () =>
          await PuppeteerAgent.create({
            pptrLaunchOptions: defaultPptrLaunchOptions,
          }),
        bodyTransformer: transformWithIFTranspiler(),
        supportedESVersion: ESVersion.ES5,
      });

    case "GIFC":
      return getDefaultFactory({
        agentFactory: async () =>
          await PuppeteerAgent.create({
            pptrLaunchOptions: defaultPptrLaunchOptions,
          }),
        bodyTransformer: transformWithAranLinvail("gifc"),
        supportedESVersion: ESVersion.ES2018,
      });

    case "Jalangi":
      return getDefaultFactory({
        agentFactory: async () =>
          await PuppeteerAgent.create({
            pptrLaunchOptions: defaultPptrLaunchOptions,
          }),
        bodyTransformer: transformWithJalangi(),
        supportedESVersion: ESVersion.ES5,
      });

    case "Linvail":
      return getDefaultFactory({
        agentFactory: async () =>
          await PuppeteerAgent.create({
            pptrLaunchOptions: defaultPptrLaunchOptions,
          }),
        bodyTransformer: transformWithAranLinvail("identity"),
        supportedESVersion: ESVersion.ES2018,
      });

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
