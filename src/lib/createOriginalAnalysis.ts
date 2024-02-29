import CertificationAuthority from "./CertificationAuthority";
import { DefaultOriginalAnalysis } from "./DefaultOriginalAnalysis";
import FaultAwareAgent from "./FaultAwareAgent";
import { OriginalAnalysis } from "./OriginalAnalysis";
import {
  createProxyHooksProviderForCompatibility,
  createProxyHooksProviderForExecution,
} from "./ProxyHooks";
import { PuppeteerAgent } from "./PuppeteerAgent";
import { defaultAnalysisRepeat, defaultPptrLaunchOptions } from "./defaults";

export const createOriginalAnalysis = (): OriginalAnalysis => {
  return new DefaultOriginalAnalysis(
    new FaultAwareAgent(
      async () =>
        await PuppeteerAgent.create(defaultPptrLaunchOptions, {
          certificationAuthority: CertificationAuthority.read(),
          proxyHooksProvider: createProxyHooksProviderForCompatibility(),
        })
    ),
    new FaultAwareAgent(
      async () =>
        await PuppeteerAgent.create(defaultPptrLaunchOptions, {
          certificationAuthority: CertificationAuthority.read(),
          proxyHooksProvider: createProxyHooksProviderForExecution(),
        })
    ),
    { analysisRepeat: defaultAnalysisRepeat }
  );
};
