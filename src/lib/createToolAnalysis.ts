import CertificationAuthority from "./CertificationAuthority";
import { DefaultToolAnalysis } from "./DefaultToolAnalysis";
import { PuppeteerAgent } from "./PuppeteerAgent";
import { transformWithJalangi } from "../tool/jalangi";
import { defaultAnalysisRepeat, defaultPptrLaunchOptions } from "./defaults";
import { ToolAnalysis } from "./ToolAnalysis";
import { ESVersion } from "../compatibility/ESVersion";
import FaultAwareAgent from "./FaultAwareAgent";
import { createExecutionProxyHooksProvider } from "./createExecutionProxyHooksProvider";
import { SeleniumAgent } from "./SeleniumAgent";
import { Browser } from "selenium-webdriver";
import { headless } from "./env";
import { transformWithJEST } from "../tool/jest";
import { transformWithIFTranspiler } from "../tool/ifTranspiler";

export const createToolAnalysis = (toolName: string): ToolAnalysis => {
  switch (toolName) {
    case "ChromiumTaintTracking":
      return new DefaultToolAnalysis(
        new FaultAwareAgent(
          async () =>
            await SeleniumAgent.create(
              {
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
              {
                thisHost: "192.168.42.1",
                certificationAuthority: CertificationAuthority.read(),
                proxyHooksProvider: createExecutionProxyHooksProvider(),
              }
            )
        ),
        {
          supportedESVersion: ESVersion.ES5,
          analysisRepeat: defaultAnalysisRepeat,
        }
      );

    case "JSFlow":
      return new DefaultToolAnalysis(
        new FaultAwareAgent(
          async () =>
            await SeleniumAgent.create(
              {
                browser: Browser.CHROME,
                server: "http://192.168.42.3:9515/wd/hub",
                binaryPath: "/home/essentialfp/chromium/src/out/Default/chrome",
                args: ["--no-sandbox", "--disable-hang-monitor"],
                headless,
              },
              {
                thisHost: "192.168.42.1",
                certificationAuthority: CertificationAuthority.read(),
                proxyHooksProvider: createExecutionProxyHooksProvider(),
              }
            )
        ),
        {
          supportedESVersion: ESVersion.ES2018,
          analysisRepeat: defaultAnalysisRepeat + 60_000,
        }
      );

    case "ProjectFoxhound":
      return new DefaultToolAnalysis(
        new FaultAwareAgent(
          async () =>
            await SeleniumAgent.create(
              {
                browser: Browser.FIREFOX,
                server: "http://127.0.0.1:4444/",
                binaryPath: "/home/osboxes/foxhound/foxhound",
                args: [],
                headless,
              },
              {
                thisHost: "127.0.0.1",
                certificationAuthority: CertificationAuthority.read(),
                proxyHooksProvider: createExecutionProxyHooksProvider(),
              }
            )
        ),
        {
          supportedESVersion: ESVersion.ES2022,
          analysisRepeat: defaultAnalysisRepeat,
        }
      );

    case "JEST":
      return new DefaultToolAnalysis(
        new FaultAwareAgent(
          async () =>
            await PuppeteerAgent.create(defaultPptrLaunchOptions, {
              certificationAuthority: CertificationAuthority.read(),
              proxyHooksProvider:
                createExecutionProxyHooksProvider(transformWithJEST),
            })
        ),
        {
          supportedESVersion: ESVersion.ES5,
          analysisRepeat: defaultAnalysisRepeat,
        }
      );

    case "IFTranspiler":
      return new DefaultToolAnalysis(
        new FaultAwareAgent(
          async () =>
            await PuppeteerAgent.create(defaultPptrLaunchOptions, {
              certificationAuthority: CertificationAuthority.read(),
              proxyHooksProvider: createExecutionProxyHooksProvider(
                transformWithIFTranspiler
              ),
            })
        ),
        {
          supportedESVersion: ESVersion.ES5,
          analysisRepeat: defaultAnalysisRepeat,
        }
      );

    case "Jalangi":
      return new DefaultToolAnalysis(
        new FaultAwareAgent(
          async () =>
            await PuppeteerAgent.create(defaultPptrLaunchOptions, {
              certificationAuthority: CertificationAuthority.read(),
              proxyHooksProvider:
                createExecutionProxyHooksProvider(transformWithJalangi),
            })
        ),
        {
          supportedESVersion: ESVersion.ES5,
          analysisRepeat: defaultAnalysisRepeat,
        }
      );

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
