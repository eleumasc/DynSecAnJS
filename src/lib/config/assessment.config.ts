import { AssessmentSession } from "../AssessmentSession";
import { PuppeteerProxyAnalysis } from "../PuppeteerProxyAnalysis";
import { esnstrument } from "../tool/jalangi";
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
        transform: async (content, contentType) => {
          switch (contentType) {
            case "html":
              return await esnstrument(content, "html");
            case "javascript":
              return await esnstrument(content, "js");
          }
        },
      },
      pptrLaunchOptions
    ),
  {
    analysisRepeat: defaultAnalysisRepeat,
  }
);
