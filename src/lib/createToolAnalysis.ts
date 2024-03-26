import {
  defaultAnalysisRepeat,
  defaultPptrLaunchOptions,
} from "../core/defaults";

import { Browser } from "selenium-webdriver";
import { DefaultToolAnalysis } from "./DefaultToolAnalysis";
import { ESVersion } from "../compatibility/ESVersion";
import FaultAwareAgent from "./FaultAwareAgent";
import { PuppeteerAgent } from "./PuppeteerAgent";
import { SeleniumAgent } from "./SeleniumAgent";
import { ToolAnalysis } from "./ToolAnalysis";
import { createExecutionHooksProvider } from "./ExecutionHooks";
import { headless } from "../core/env";
import { transformWithIFTranspiler } from "../tools/ifTranspiler";
import { transformWithJEST } from "../tools/jest";
import { transformWithJalangi } from "../tools/jalangi";

export const createToolAnalysis = (toolName: string): ToolAnalysis => {
  switch (toolName) {
    case "ChromiumTaintTracking":
      return new DefaultToolAnalysis(
        new FaultAwareAgent(
          async () =>
            await SeleniumAgent.create({
              webDriverOptions: {
                browser: Browser.CHROME,
                server: "http://192.168.42.2:9515/wd/hub",
                binaryPath:
                  "/home/user/Documents/chromium_taint_tracking/src/out/Debug/chrome",
                args: [
                  '--js-flags="--taint_log_file=/home/user/logfiles/logfile.txt --no-crankshaft --no-turbo --no-ignition"',
                  "--no-sandbox",
                  "--disable-hang-monitor",
                ],
                headless,
              },
              localHost: "192.168.42.1",
            })
        ),
        {
          toolName,
          executionHooksProvider: createExecutionHooksProvider(),
          supportedESVersion: ESVersion.ES5,
          analysisRepeat: defaultAnalysisRepeat,
        }
      );

    case "JSFlow":
      return new DefaultToolAnalysis(
        new FaultAwareAgent(
          async () =>
            await SeleniumAgent.create({
              webDriverOptions: {
                browser: Browser.CHROME,
                server: "http://192.168.42.3:9515/wd/hub",
                binaryPath: "/home/essentialfp/chromium/src/out/Default/chrome",
                args: ["--no-sandbox", "--disable-hang-monitor"],
                headless,
              },
              localHost: "192.168.42.1",
            })
        ),
        {
          toolName,
          executionHooksProvider: createExecutionHooksProvider(),
          supportedESVersion: ESVersion.ES2018,
          analysisRepeat: defaultAnalysisRepeat + 60_000,
        }
      );

    case "ProjectFoxhound":
      return new DefaultToolAnalysis(
        new FaultAwareAgent(
          async () =>
            await SeleniumAgent.create({
              webDriverOptions: {
                browser: Browser.FIREFOX,
                server: "http://127.0.0.1:4444/",
                binaryPath: "/home/osboxes/foxhound/foxhound",
                args: [],
                headless,
              },
              localHost: "127.0.0.1",
            })
        ),
        {
          toolName,
          executionHooksProvider: createExecutionHooksProvider(),
          supportedESVersion: ESVersion.ES2022,
          analysisRepeat: defaultAnalysisRepeat,
        }
      );

    case "JEST":
      return new DefaultToolAnalysis(
        new FaultAwareAgent(
          async () =>
            await PuppeteerAgent.create({
              pptrLaunchOptions: defaultPptrLaunchOptions,
            })
        ),
        {
          toolName,
          executionHooksProvider:
            createExecutionHooksProvider(transformWithJEST),
          supportedESVersion: ESVersion.ES5,
          analysisRepeat: defaultAnalysisRepeat,
        }
      );

    case "IFTranspiler":
      return new DefaultToolAnalysis(
        new FaultAwareAgent(
          async () =>
            await PuppeteerAgent.create({
              pptrLaunchOptions: defaultPptrLaunchOptions,
            })
        ),
        {
          toolName,
          executionHooksProvider: createExecutionHooksProvider(
            transformWithIFTranspiler
          ),
          supportedESVersion: ESVersion.ES5,
          analysisRepeat: defaultAnalysisRepeat,
        }
      );

    case "Jalangi":
      return new DefaultToolAnalysis(
        new FaultAwareAgent(
          async () =>
            await PuppeteerAgent.create({
              pptrLaunchOptions: defaultPptrLaunchOptions,
            })
        ),
        {
          toolName,
          executionHooksProvider:
            createExecutionHooksProvider(transformWithJalangi),
          supportedESVersion: ESVersion.ES5,
          analysisRepeat: defaultAnalysisRepeat,
        }
      );

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
