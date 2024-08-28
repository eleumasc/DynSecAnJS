import * as parse5 from "parse5";

import {
  AttributeHtmlScript,
  ElementHtmlScript,
  HtmlScript,
} from "./HTMLScript";
import { Document, Node } from "parse5/dist/tree-adapters/default";
import { getAttribute, getChildNodes, isElement } from "./util";
import { isESModuleMimeType, isJavaScriptMimeType } from "../util/mimeType";

import { htmlEventAttributes } from "./htmlEventAttributes";

export default class HtmlDocument {
  constructor(
    readonly documentNode: Document,
    readonly baseUrl: string | undefined,
    readonly rawImportMap: string | undefined,
    readonly scriptList: HtmlScript[]
  ) {}

  serialize() {
    return parse5.serialize(this.documentNode);
  }

  static parse(input: string): HtmlDocument {
    const documentNode = parse5.parse(input);
    let baseUrl: string | undefined;
    let rawImportMap: string | undefined;
    const scriptList: HtmlScript[] = [];
    traverse(documentNode);
    return new HtmlDocument(documentNode, baseUrl, rawImportMap, scriptList);

    function traverse(node: Node): void {
      if (isElement(node)) {
        if (node.tagName === "base") {
          baseUrl = baseUrl ?? getAttribute(node, "href");
        }

        if (node.tagName === "script") {
          const type = getAttribute(node, "type");
          if (
            type === undefined ||
            isJavaScriptMimeType(type) ||
            isESModuleMimeType(type)
          ) {
            const htmlScript = new ElementHtmlScript(node);
            if (htmlScript.isExternal || htmlScript.inlineSource.length !== 0) {
              scriptList.push(htmlScript);
            }
          } else if (type === "importmap") {
            rawImportMap =
              rawImportMap ?? new ElementHtmlScript(node).inlineSource;
          }
        }

        for (const attr of node.attrs) {
          if (htmlEventAttributes.includes(attr.name)) {
            scriptList.push(new AttributeHtmlScript(attr));
          }
        }
      }

      for (const childNode of getChildNodes(node)) {
        traverse(childNode);
      }
    }
  }
}
