import { AssessmentSession } from "../AssessmentSession";
import { PuppeteerProxyAnalysis } from "../PuppeteerProxyAnalysis";
import { transformWithJalangi } from "../tool/jalangi";
import { defaultAnalysisRepeat, defaultPptrLaunchOptions } from "./options";

export default new AssessmentSession(
  () =>
    PuppeteerProxyAnalysis.create(
      {
        transform: async (content, _contentType) => {
          return content;
        },
      },
      defaultPptrLaunchOptions
    ),
  () =>
    PuppeteerProxyAnalysis.create(
      {
        transform: transformWithJalangi,
      },
      defaultPptrLaunchOptions
    ),
  {
    analysisRepeat: defaultAnalysisRepeat,
  }
);
