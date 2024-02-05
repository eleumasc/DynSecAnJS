import { TestSession } from "../TestSession";
import { defaultAnalysisRepeat, defaultPptrLaunchOptions } from "./options";
import { transformWithJalangi } from "../tool/jalangi";
import { PuppeteerProxyAnalysis } from "../PuppeteerProxyAnalysis";

export default new TestSession(
  () =>
    PuppeteerProxyAnalysis.create(
      {
        transform: transformWithJalangi,
      },
      {
        ...defaultPptrLaunchOptions,
        headless: false,
      }
    ),
  {
    analysisRepeat: defaultAnalysisRepeat,
  }
);
