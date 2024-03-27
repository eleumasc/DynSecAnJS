import {
  defaultAnalysisRepeat,
  defaultFaultAwarenessDeltaMs,
  defaultLoadingTimeoutMs,
  defaultPptrLaunchOptions,
} from "../core/defaults";

import { DefaultOriginalAnalysis } from "./DefaultOriginalAnalysis";
import FaultAwareAgent from "./FaultAwareAgent";
import { OriginalAnalysis } from "./OriginalAnalysis";
import { PuppeteerAgent } from "./PuppeteerAgent";
import { createCompatibilityHooksProvider } from "./CompatibilityHooks";
import { createExecutionHooksProvider } from "./ExecutionHooks";

export type OriginalAnalysisFactory = () => OriginalAnalysis;

export const getOriginalAnalysisFactory = (): OriginalAnalysisFactory => {
  return () => {
    const analysisRepeat = defaultAnalysisRepeat;
    const loadingTimeoutMs = defaultLoadingTimeoutMs;
    const faultAwarenessTimeoutMs =
      loadingTimeoutMs + defaultFaultAwarenessDeltaMs;

    return new DefaultOriginalAnalysis(
      new FaultAwareAgent(
        faultAwarenessTimeoutMs,
        async () =>
          await PuppeteerAgent.create({
            pptrLaunchOptions: defaultPptrLaunchOptions,
          })
      ),
      {
        compatibilityHooksProvider: createCompatibilityHooksProvider(),
        executionHooksProvider: createExecutionHooksProvider(),
        analysisRepeat,
        loadingTimeoutMs,
      }
    );
  };
};
