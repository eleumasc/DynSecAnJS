import * as parse5 from "parse5";
import { Node } from "parse5/dist/tree-adapters/default";
import { getChildNodes, isElement } from "../html-manipulation/util";
import { htmlEventAttributes } from "./htmlEventAttributes";

export interface ExtractedInlineScript {
  code: string;
  isEventHandler: boolean;
}

export const extractInlineScripts = (html: string): ExtractedInlineScript[] => {
  return findInlineScripts(parse5.parse(html));
};

const findInlineScripts = (node: Node): ExtractedInlineScript[] => {
  const result: ExtractedInlineScript[] = [];
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
        result.push({ code: scriptNode.value, isEventHandler: false });
      }
    }
    for (const attr of node.attrs) {
      if (htmlEventAttributes.includes(attr.name)) {
        result.push({ code: attr.value, isEventHandler: true });
      }
    }
  }

  for (const childNode of getChildNodes(node)) {
    result.push(...findInlineScripts(childNode));
  }

  return result;
};
