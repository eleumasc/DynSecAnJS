import CertificationAuthority from "./CertificationAuthority";
import { DefaultOriginalAnalysis } from "./DefaultOriginalAnalysis";
import FaultAwareAgent from "./FaultAwareAgent";
import { OriginalAnalysis } from "./OriginalAnalysis";
import { createCompatibilityProxyHooksProvider } from "./compatibility/createCompatibilityProxyHooksProvider";
import { createExecutionProxyHooksProvider } from "./createExecutionProxyHooksProvider";
import { PuppeteerAgent } from "./PuppeteerAgent";
import { defaultAnalysisRepeat, defaultPptrLaunchOptions } from "./defaults";

export const createOriginalAnalysis = (): OriginalAnalysis => {
  return new DefaultOriginalAnalysis(
    new FaultAwareAgent(
      async () =>
        await PuppeteerAgent.create(defaultPptrLaunchOptions, {
          certificationAuthority: CertificationAuthority.read(),
          proxyHooksProvider: createCompatibilityProxyHooksProvider(),
        })
    ),
    new FaultAwareAgent(
      async () =>
        await PuppeteerAgent.create(defaultPptrLaunchOptions, {
          certificationAuthority: CertificationAuthority.read(),
          proxyHooksProvider: createExecutionProxyHooksProvider(),
        })
    ),
    { analysisRepeat: defaultAnalysisRepeat }
  );
};
