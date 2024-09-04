import { ElementHTMLScript } from "../../htmlutil/HTMLScript";
import { HTMLManipulator } from "./HTMLManipulator";

export const transformInlineScripts =
  (transformScript: (source: string) => Promise<string>): HTMLManipulator =>
  async (htmlDocument) => {
    for (const htmlScript of htmlDocument.activeScripts) {
      if (htmlScript instanceof ElementHTMLScript && htmlScript.isInline) {
        htmlScript.inlineSource = await transformScript(
          htmlScript.inlineSource
        );
      }
    }
  };
