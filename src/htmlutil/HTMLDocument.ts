import * as parse5 from "parse5";
import assert from "assert";
import { Document, Element, Node } from "parse5/dist/tree-adapters/default";
import {
  getAttribute,
  getChildNodes,
  isElement,
  setAttribute
  } from "./util";
import { htmlEventAttributes } from "./htmlEventAttributes";
import { isESModuleMimeType, isJavaScriptMimeType } from "../util/mimeType";

import {
  AttributeHtmlScript,
  ElementHtmlScript,
  HtmlScript,
} from "./HTMLScript";

export default class HtmlDocument {
  constructor(
    readonly documentNode: Document,
    readonly headNode: Element,
    readonly baseUrl: string | undefined,
    readonly nonce: string | undefined,
    readonly rawImportMap: string | undefined,
    readonly scriptList: HtmlScript[]
  ) {}

  serialize() {
    return parse5.serialize(this.documentNode);
  }

  createInitHtmlScript(): ElementHtmlScript {
    const element = parse5.parseFragment("<script></script>").childNodes[0];
    assert(isElement(element) && element.tagName === "script");
    this.headNode.childNodes.unshift(element);

    if (this.nonce) {
      setAttribute(element, "nonce", this.nonce);
    }

    const htmlScript = new ElementHtmlScript(element);
    this.scriptList.push(htmlScript);
    return htmlScript;
  }

  static parse(input: string): HtmlDocument {
    const documentNode = parse5.parse(input);
    let headNode: Element | undefined;
    let baseUrl: string | undefined;
    let nonce: string | undefined;
    let rawImportMap: string | undefined;
    const scriptList: HtmlScript[] = [];

    traverse(documentNode);

    assert(headNode);
    return new HtmlDocument(
      documentNode,
      headNode,
      baseUrl,
      nonce,
      rawImportMap,
      scriptList
    );

    function traverse(node: Node): void {
      if (isElement(node)) {
        const { tagName } = node;

        if (tagName === "head") {
          headNode = headNode ?? node;
        } else if (tagName === "base") {
          baseUrl = baseUrl ?? getAttribute(node, "href");
        } else if (tagName === "script") {
          const type = getAttribute(node, "type");
          if (
            type === undefined ||
            isJavaScriptMimeType(type) ||
            isESModuleMimeType(type)
          ) {
            nonce = nonce ?? getAttribute(node, "nonce");
            const htmlScript = new ElementHtmlScript(node);
            scriptList.push(htmlScript);
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
