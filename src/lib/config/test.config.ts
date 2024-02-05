import { TestSession } from "../TestSession";
import { PuppeteerAnalysis } from "../PuppeteerAnalysis";
import { defaultAnalysisRepeat, defaultPptrLaunchOptions } from "./options";

export default new TestSession(
  () => PuppeteerAnalysis.create(defaultPptrLaunchOptions),
  {
    analysisRepeat: defaultAnalysisRepeat,
  }
);
