import { TestSession } from "../TestSession";
import { defaultAnalysisRepeat, pptrLaunchOptions } from "./options";
import { transformWithJalangi } from "../tool/jalangi";
import { PuppeteerProxyAnalysis } from "../PuppeteerProxyAnalysis";

export default new TestSession(
  () =>
    PuppeteerProxyAnalysis.create(
      {
        transform: transformWithJalangi,
      },
      {
        ...pptrLaunchOptions,
        headless: false,
      }
    ),
  {
    analysisRepeat: defaultAnalysisRepeat,
  }
);
