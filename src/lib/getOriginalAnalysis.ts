import {
  defaultAnalysisRepeat,
  defaultLoadingTimeoutMs,
  defaultPptrLaunchOptions,
} from "../core/defaults";

import { DefaultOriginalAnalysis } from "./DefaultOriginalAnalysis";
import { IPCAgent } from "./IPCAgent";
import { OriginalAnalysis } from "./OriginalAnalysis";
import { PuppeteerAgent } from "./PuppeteerAgent";
import { createCompatibilityHooksProvider } from "./CompatibilityHooks";
import { createExecutionHooksProvider } from "./ExecutionHooks";

export const getOriginalAnalysis = (): OriginalAnalysis => {
  const analysisRepeat = defaultAnalysisRepeat;
  const loadingTimeoutMs = defaultLoadingTimeoutMs;

  // IPCAgent.from(
  //   new PuppeteerAgent({
  //     pptrLaunchOptions: defaultPptrLaunchOptions,
  //   })
  // ),
  return new DefaultOriginalAnalysis(
    new PuppeteerAgent({
      pptrLaunchOptions: defaultPptrLaunchOptions,
    }),
    {
      compatibilityHooksProvider: createCompatibilityHooksProvider(),
      executionHooksProvider: createExecutionHooksProvider(),
      analysisRepeat,
      loadingTimeoutMs,
    }
  );
};
