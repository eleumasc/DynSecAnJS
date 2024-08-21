import { ChildNode, Element, Node } from "parse5/dist/tree-adapters/default";

import _ from "lodash";

export const getChildNodes = (node: Node): ChildNode[] => {
  return "childNodes" in node ? node.childNodes : [];
};

export const isElement = (node: Node): node is Element => {
  return "tagName" in node;
};

export const getAttribute = (
  element: Element,
  name: string
): string | undefined =>
  element.attrs.find((attr) => attr.name === name)?.value;

export const setAttribute = (
  element: Element,
  name: string,
  value: string
): void => {
  element.attrs = [
    ..._.reject(element.attrs, (attr) => attr.name === name),
    { name, value },
  ];
};

export const removeAttribute = (element: Element, name: string): void => {
  element.attrs = _.reject(element.attrs, (attr) => attr.name === name);
};
