import { TestSession } from "../TestSession";
import { PuppeteerAnalysis } from "../PuppeteerAnalysis";
import { defaultAnalysisRepeat, pptrLaunchOptions } from "./options";

export default new TestSession(
  () => PuppeteerAnalysis.create(pptrLaunchOptions),
  {
    analysisRepeat: defaultAnalysisRepeat,
  }
);
