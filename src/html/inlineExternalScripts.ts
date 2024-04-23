import * as parse5 from "parse5";

import { getChildNodes, isElement } from "./util";

import { HtmlTransformer } from "./HtmlTransformer";
import { Node } from "parse5/dist/tree-adapters/default";
import assert from "assert";
import fetch from "node-fetch";

export const inlineExternalScripts = (baseUrl: URL): HtmlTransformer =>
  async function visitNode(node: Node): Promise<void> {
    await Promise.all([
      (async () => {
        if (isElement(node)) {
          if (
            node.tagName === "script" &&
            (node.attrs
              .find((attr) => attr.name === "type")
              ?.value.includes("javascript") ??
              true)
          ) {
            const srcUrl = node.attrs.find(
              (attr) => attr.name === "src"
            )?.value;
            if (!srcUrl) {
              return;
            }

            const url = new URL(srcUrl, baseUrl);
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(
                `Failed to inline external script at ${url.href}: ${response.status} ${response.statusText}`
              );
            }
            const scriptContent = await response.text();

            const inlineScriptNode = parse5.parseFragment(
              `<script>${scriptContent}</script>`
            ).childNodes[0];
            assert(isElement(inlineScriptNode));
            inlineScriptNode.attrs = node.attrs.filter(
              (attr) => attr.name !== "src"
            );
            const parent = node.parentNode!;
            parent.childNodes[parent.childNodes.indexOf(node)] =
              inlineScriptNode;
          }
        }
      })(),
      ...getChildNodes(node).map((childNode) => visitNode(childNode)),
    ]);
  };
