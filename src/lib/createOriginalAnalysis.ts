import {
  defaultAnalysisRepeat,
  defaultPptrLaunchOptions,
} from "../core/defaults";

import { DefaultOriginalAnalysis } from "./DefaultOriginalAnalysis";
import FaultAwareAgent from "./FaultAwareAgent";
import { OriginalAnalysis } from "./OriginalAnalysis";
import { PuppeteerAgent } from "./PuppeteerAgent";
import { createCompatibilityHooksProvider } from "./CompatibilityHooks";
import { createExecutionHooksProvider } from "./ExecutionHooks";

export const createOriginalAnalysis = (): OriginalAnalysis => {
  return new DefaultOriginalAnalysis(
    new FaultAwareAgent(
      async () =>
        await PuppeteerAgent.create({
          pptrLaunchOptions: defaultPptrLaunchOptions,
        })
    ),
    {
      compatibilityHooksProvider: createCompatibilityHooksProvider(),
      executionHooksProvider: createExecutionHooksProvider(),
      analysisRepeat: defaultAnalysisRepeat,
    }
  );
};
