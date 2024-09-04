import _ from "lodash";
import assert from "assert";
import { Attribute } from "parse5/dist/common/token";
import { Element, TextNode } from "parse5/dist/tree-adapters/default";
import { getAttribute, removeAttribute, setAttribute } from "./util";

export interface HTMLScript {}

export class ElementHTMLScript implements HTMLScript {
  constructor(readonly element: Element) {}

  get isExternal(): boolean {
    return getAttribute(this.element, "src") !== undefined;
  }

  get isInline(): boolean {
    return !this.isExternal;
  }

  get src(): string {
    const value = getAttribute(this.element, "src");
    assert(value !== undefined);
    return value;
  }

  set src(x: string) {
    setAttribute(this.element, "src", x);
    this.textContent = undefined;
  }

  get inlineSource(): string {
    return this.textContent ?? "";
  }

  set inlineSource(x: string) {
    this.textContent = x;
    removeAttribute(this.element, "src");
  }

  get isDefer(): boolean {
    return getAttribute(this.element, "defer") !== undefined;
  }

  set isDefer(x: boolean) {
    if (x) {
      setAttribute(this.element, "defer", "");
    } else {
      removeAttribute(this.element, "defer");
    }
  }

  get isAsync(): boolean {
    return getAttribute(this.element, "async") !== undefined;
  }

  set isAsync(x: boolean) {
    if (x) {
      setAttribute(this.element, "async", "");
    } else {
      removeAttribute(this.element, "async");
    }
  }

  get integrity(): string | undefined {
    return getAttribute(this.element, "integrity");
  }

  set integrity(x: string | undefined) {
    if (x !== undefined) {
      setAttribute(this.element, "integrity", x);
    } else {
      removeAttribute(this.element, "integrity");
    }
  }

  get isModule(): boolean {
    return getAttribute(this.element, "type") === "module";
  }

  set isModule(x: boolean) {
    if (x) {
      setAttribute(this.element, "type", "module");
    } else {
      removeAttribute(this.element, "type");
    }
  }

  get isNoModule(): boolean {
    return getAttribute(this.element, "nomodule") !== undefined;
  }

  protected get textContent(): string | undefined {
    const textContentNode = this.element.childNodes[0];
    if (textContentNode) {
      assert("value" in textContentNode);
    }
    return textContentNode?.value;
  }

  protected set textContent(x: string | undefined) {
    let textContentNode = this.element.childNodes[0];
    if (textContentNode) {
      assert("value" in textContentNode);
    }
    if (x !== undefined) {
      if (textContentNode) {
        textContentNode.value = x;
      } else {
        textContentNode = <TextNode>{
          nodeName: "#text",
          parentNode: this.element,
          value: x,
        };
        this.element.childNodes = [textContentNode, ...this.element.childNodes];
      }
    } else {
      if (textContentNode) {
        this.element.childNodes = _.reject(
          this.element.childNodes,
          (childNode) => childNode === textContentNode
        );
      }
    }
  }
}

export class AttributeHTMLScript implements HTMLScript {
  constructor(readonly attr: Attribute) {}

  get inlineSource(): string {
    return this.attr.value;
  }

  set inlineSource(x: string) {
    this.attr.value = x;
  }
}
