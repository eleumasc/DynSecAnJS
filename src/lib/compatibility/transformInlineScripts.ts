import * as parse5 from "parse5";
import { Node } from "parse5/dist/tree-adapters/default";
import { getChildNodes, isElement } from "../util/html";
import { htmlEventAttributes } from "./htmlEventAttributes";

export const transformInlineScripts = async (
  html: string,
  transform: (code: string, isEventHandler: boolean) => Promise<string>
): Promise<string> => {
  const document = parse5.parse(html);

  await (async function visitNode(node: Node): Promise<void> {
    if (isElement(node)) {
      if (
        node.tagName === "script" &&
        (node.attrs
          .find((attr) => attr.name === "type")
          ?.value.includes("javascript") ??
          true) &&
        node.childNodes.length > 0
      ) {
        const scriptNode = node.childNodes[0];
        if ("value" in scriptNode) {
          scriptNode.value = await transform(scriptNode.value, false);
        }
      }
      for (const attr of node.attrs) {
        if (htmlEventAttributes.includes(attr.name)) {
          attr.value = await transform(attr.value, false);
        }
      }
    }

    for (const childNode of getChildNodes(node)) {
      visitNode(childNode);
    }
  })(document);

  const modifiedHtml = parse5.serialize(document);

  return modifiedHtml;
};
