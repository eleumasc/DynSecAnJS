import CertificationAuthority from "./CertificationAuthority";
import { DefaultToolAnalysis } from "./DefaultToolAnalysis";
import { PuppeteerAgent } from "./PuppeteerAgent";
import { transformWithJalangi } from "./tool/jalangi";
import { defaultAnalysisRepeat, defaultPptrLaunchOptions } from "./defaults";
import { ToolAnalysis } from "./ToolAnalysis";
import { ESVersion } from "./compatibility/ESVersion";
import FaultAwareAgent from "./FaultAwareAgent";
import { createProxyHooksProviderForExecution } from "./ProxyHooks";

export const createToolAnalysis = (toolName: string): ToolAnalysis => {
  switch (toolName) {
    case "jalangi":
      return new DefaultToolAnalysis(
        new FaultAwareAgent(
          async () =>
            await PuppeteerAgent.create(defaultPptrLaunchOptions, {
              certificationAuthority: CertificationAuthority.read(),
              proxyHooksProvider:
                createProxyHooksProviderForExecution(transformWithJalangi),
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
