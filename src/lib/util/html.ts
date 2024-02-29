import { ChildNode, Element, Node } from "parse5/dist/tree-adapters/default";

export const getChildNodes = (node: Node): ChildNode[] => {
  return "childNodes" in node ? node.childNodes : [];
};

export const isElement = (node: Node): node is Element => {
  return "tagName" in node;
};
