import * as parse5 from "parse5";
import { Element, Node } from "parse5/dist/tree-adapters/default";
import { getChildNodes, isElement } from "./util";
import { HtmlTransformer } from "./HtmlTransformer";

export const injectScripts =
  (scriptSrcs: string[]): HtmlTransformer =>
  async (document) => {
    const headNode = findHeadNode(document);

    if (headNode) {
      headNode.childNodes.unshift(
        ...scriptSrcs
          .map(
            (scriptSrc) =>
              parse5.parseFragment(
                `<script src="${scriptSrc}"></script>`
              ) as Element
          )
          .map((scriptElement) => scriptElement.childNodes[0])
      );
    }
  };

const findHeadNode = (node: Node): Element | null => {
  if (isElement(node) && node.tagName === "head") {
    return node;
  }

  for (const childNode of getChildNodes(node)) {
    const result = findHeadNode(childNode);
    if (result) {
      return result;
    }
  }

  return null;
};
