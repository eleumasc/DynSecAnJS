import * as parse5 from "parse5";
import { ChildNode, Element, Node } from "parse5/dist/tree-adapters/default";

export const injectScript = (html: string, scriptSrc: string): string => {
  const document = parse5.parse(html);

  const scriptElement = parse5.parseFragment(
    `<script src="${scriptSrc}"></script>`
  ) as Element;

  const headNode = findHeadNode(document);

  if (headNode) {
    headNode.childNodes.unshift(scriptElement.childNodes[0]);
  }

  const modifiedHtml = parse5.serialize(document);

  return modifiedHtml;
};

function findHeadNode(node: Node): Element | null {
  if (isElement(node) && node.tagName === "head") {
    return node;
  }

  if (hasChildNodes(node)) {
    for (const childNode of node.childNodes) {
      const result = findHeadNode(childNode);
      if (result) {
        return result;
      }
    }
  }

  return null;
}

function isElement(node: Node): node is Element {
  return "tagName" in node;
}

function hasChildNodes(node: Node): node is Node & { childNodes: ChildNode[] } {
  return "childNodes" in node;
}
