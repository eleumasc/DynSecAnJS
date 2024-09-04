import * as parse5 from "parse5";
import _ from "lodash";
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
  AttributeHTMLScript,
  ElementHTMLScript,
  HTMLScript,
} from "./HTMLScript";

export default class HTMLDocument {
  constructor(
    readonly documentNode: Document,
    readonly headNode: Element,
    readonly baseUrl: string | undefined,
    readonly nonce: string | undefined,
    readonly rawImportMap: string | undefined,
    protected scriptArray: HTMLScript[]
  ) {}

  get scripts(): HTMLScript[] {
    return [...this.scriptArray];
  }

  get activeScripts(): HTMLScript[] {
    return this.scriptArray.filter(
      (script) => !(script instanceof ElementHTMLScript && script.isNoModule)
    );
  }

  serialize() {
    return parse5.serialize(this.documentNode);
  }

  removeElementScript(htmlScript: ElementHTMLScript): void {
    assert(this.scriptArray.includes(htmlScript));

    const scriptNode = htmlScript.element;
    const parentNode = scriptNode.parentNode;
    assert(parentNode);
    parentNode.childNodes = _.reject(
      parentNode.childNodes,
      (node) => node === scriptNode
    );

    this.scriptArray = _.reject(
      this.scriptArray,
      (otherHtmlScript) => otherHtmlScript === htmlScript
    );
  }

  createInitScript(): ElementHTMLScript {
    const element = parse5.parseFragment("<script></script>").childNodes[0];
    assert(isElement(element) && element.tagName === "script");
    this.headNode.childNodes.unshift(element);

    if (this.nonce) {
      setAttribute(element, "nonce", this.nonce);
    }

    const htmlScript = new ElementHTMLScript(element);
    this.scriptArray = [...this.scriptArray, htmlScript];
    return htmlScript;
  }

  static parse(input: string): HTMLDocument {
    const documentNode = parse5.parse(input);
    let headNode: Element | undefined;
    let baseUrl: string | undefined;
    let nonce: string | undefined;
    let rawImportMap: string | undefined;
    const scriptArray: HTMLScript[] = [];

    traverse(documentNode);

    assert(headNode);
    return new HTMLDocument(
      documentNode,
      headNode,
      baseUrl,
      nonce,
      rawImportMap,
      scriptArray
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
            const htmlScript = new ElementHTMLScript(node);
            scriptArray.push(htmlScript);
          } else if (type === "importmap") {
            rawImportMap =
              rawImportMap ?? new ElementHTMLScript(node).inlineSource;
          }
        }

        for (const attr of node.attrs) {
          if (htmlEventAttributes.includes(attr.name)) {
            scriptArray.push(new AttributeHTMLScript(attr));
          }
        }
      }

      for (const childNode of getChildNodes(node)) {
        traverse(childNode);
      }
    }
  }
}
