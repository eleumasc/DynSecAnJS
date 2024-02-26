import * as parse5 from "parse5";
import { ChildNode, Element, Node } from "parse5/dist/tree-adapters/default";

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

  if (hasChildNodes(node)) {
    for (const childNode of node.childNodes) {
      const result = findHeadNode(childNode);
      if (result) {
        return result;
      }
    }
  }

  return null;
};

const isElement = (node: Node): node is Element => {
  return "tagName" in node;
};

const hasChildNodes = (
  node: Node
): node is Node & { childNodes: ChildNode[] } => {
  return "childNodes" in node;
};
