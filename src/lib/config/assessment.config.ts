import { AssessmentSession } from "../AssessmentSession";
import { PuppeteerProxyAnalysis } from "../PuppeteerProxyAnalysis";
import { transformWithJalangi } from "../tool/jalangi";
import { defaultAnalysisRepeat, pptrLaunchOptions } from "./options";

export default new AssessmentSession(
  () =>
    PuppeteerProxyAnalysis.create(
      {
        transform: async (content, _contentType) => {
          return content;
        },
      },
      pptrLaunchOptions
    ),
  () =>
    PuppeteerProxyAnalysis.create(
      {
        transform: transformWithJalangi,
      },
      pptrLaunchOptions
    ),
  {
    analysisRepeat: defaultAnalysisRepeat,
  }
);
