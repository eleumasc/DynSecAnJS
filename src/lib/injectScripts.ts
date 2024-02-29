import * as parse5 from "parse5";
import { Element, Node } from "parse5/dist/tree-adapters/default";
import { getChildNodes, isElement } from "./util/html";

export const injectScripts = (html: string, scriptSrcs: string[]): string => {
  const document = parse5.parse(html);

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

  const modifiedHtml = parse5.serialize(document);

  return modifiedHtml;
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
