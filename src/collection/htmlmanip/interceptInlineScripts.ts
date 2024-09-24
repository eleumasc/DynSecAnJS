import { ElementHTMLScript } from "../../htmlutil/HTMLScript";
import { HTMLManipulator } from "./HTMLManipulator";

export const interceptInlineScripts =
  (interceptScript: (source: string) => Promise<string>): HTMLManipulator =>
  async (htmlDocument) => {
    for (const htmlScript of htmlDocument.activeScripts) {
      if (htmlScript instanceof ElementHTMLScript && htmlScript.isInline) {
        await interceptScript(htmlScript.inlineSource);
      }
    }
  };
