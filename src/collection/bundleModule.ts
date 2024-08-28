import { types as t, transformSync } from "@babel/core";

import { Readable } from "stream";
import browserPack from "browser-pack";
import { bundleModulePrelude } from "./bundleModulePrelude";
import { streamToString } from "../util/streamToString";

export interface BrowserPackEntry {
  id: string;
  source: string;
  deps: Record<string, string>;
}

function babelPluginTransformImportMeta(): babel.PluginItem {
  return {
    visitor: {
      MetaProperty(path) {
        const { node } = path;
        if (node.meta.name === "import" && node.property.name === "meta") {
          path.scope.rename("module");
          path.replaceWith(
            t.memberExpression(t.identifier("module"), t.identifier("meta"))
          );
        }
      },
    },
  };
}

function babelPluginDenyTopLevelAwait(): babel.PluginItem {
  return {
    visitor: {
      AwaitExpression(path) {
        const parentPath = path.findParent((p) => p.isFunction());
        if (!parentPath) {
          throw path.buildCodeFrameError(
            "Top-level await expressions are not supported."
          );
        }
      },
    },
  };
}

const transformESModuleToCommonJS = (source: string): string =>
  transformSync(source, {
    parserOpts: {
      sourceType: "module",
    },
    plugins: [
      "@babel/plugin-transform-modules-commonjs",
      babelPluginTransformImportMeta,
      babelPluginDenyTopLevelAwait,
    ],
  })!.code!;

export const bundleModule = (entries: BrowserPackEntry[]): Promise<string> =>
  streamToString(
    Readable.from([
      JSON.stringify(
        entries.map(({ source, ...rest }) => ({
          ...rest,
          source: transformESModuleToCommonJS(source),
        }))
      ),
    ]).pipe(
      browserPack({
        prelude: `(${bundleModulePrelude})()`,
      })
    )
  );
