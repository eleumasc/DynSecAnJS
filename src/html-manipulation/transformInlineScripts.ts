import { Node } from "parse5/dist/tree-adapters/default";
import { getChildNodes, isElement } from "./util";
import { htmlEventAttributes } from "../compatibility/htmlEventAttributes";
import { HtmlTransformer } from "./HtmlTransformer";

export const transformInlineScripts = (
  transform: (code: string, isEventHandler: boolean) => Promise<string>
): HtmlTransformer =>
  async function visitNode(node: Node): Promise<void> {
    await Promise.all([
      (async () => {
        if (isElement(node)) {
          if (
            node.tagName === "script" &&
            (node.attrs
              .find((attr) => attr.name === "type")
              ?.value.includes("javascript") ??
              true) &&
            node.childNodes.length > 0
          ) {
            const codeNode = node.childNodes[0];
            if ("value" in codeNode) {
              codeNode.value = await transform(codeNode.value, false);
            }
          }
          for (const attr of node.attrs) {
            if (htmlEventAttributes.includes(attr.name)) {
              attr.value = await transform(attr.value, true);
            }
          }
        }
      })(),
      ...getChildNodes(node).map((childNode) => visitNode(childNode)),
    ]);
  };
