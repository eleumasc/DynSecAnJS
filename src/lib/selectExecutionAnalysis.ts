import CertificationAuthority from "./CertificationAuthority";
import { DefaultExecutionAnalysis } from "./DefaultExecutionAnalysis";
import { PuppeteerAgent } from "./PuppeteerAgent";
import { transformWithJalangi } from "./tool/jalangi";
import { defaultAnalysisRepeat, defaultPptrLaunchOptions } from "./defaults";
import { ExecutionAnalysis } from "./ExecutionAnalysis";
import { JavaScriptVersion } from "./compatibility/JavaScriptVersion";
import FaultAwareAgent from "./FaultAwareAgent";

export const selectExecutionAnalysis = (
  toolName: string
): ExecutionAnalysis => {
  switch (toolName) {
    case "jalangi":
      return new DefaultExecutionAnalysis(
        new FaultAwareAgent(
          async () =>
            await PuppeteerAgent.create({
              pptrLaunchOptions: defaultPptrLaunchOptions,
              certificationAuthority: CertificationAuthority.read(),
            })
        ),
        new FaultAwareAgent(
          async () =>
            await PuppeteerAgent.create({
              pptrLaunchOptions: defaultPptrLaunchOptions,
              certificationAuthority: CertificationAuthority.read(),
              transform: transformWithJalangi,
            })
        ),
        {
          supportedJavaScriptVersion: JavaScriptVersion.ES5,
          analysisRepeat: defaultAnalysisRepeat,
        }
      );
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
