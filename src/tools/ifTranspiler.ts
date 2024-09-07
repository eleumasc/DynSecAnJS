import path from "path";
import { addInitScript } from "../collection/htmlmanip/addInitScript";
import { composeHTMLManipulators } from "../collection/htmlmanip/HTMLManipulator";
import { execTool } from "./execTool";
import { ifTranspilerPath } from "../env";
import { inlineExternalScripts } from "../collection/htmlmanip/inlineExternalScripts";
import { manipulateHTML } from "../collection/htmlmanip/manipulateHTML";
import { transformInlineScripts } from "../collection/htmlmanip/transformInlineScripts";
import {
  transformWPRArchive,
  WPRArchiveTransformer,
} from "../collection/WPRArchiveTransformer";

export const transformWithIFTranspiler = (): WPRArchiveTransformer =>
  transformWPRArchive(
    (body, _, originalWPRArchive, preanalyzeReport) =>
      manipulateHTML(
        body,
        composeHTMLManipulators(
          inlineExternalScripts(originalWPRArchive, preanalyzeReport, true),
          transformInlineScripts(() => ifTranspiler(body)),
          addInitScript(setupCode)
        )
      ),
    (body) => Promise.resolve(body)
  );

export const ifTranspiler = (source: string): Promise<string> =>
  execTool(source, "js", (originalPath, modifiedPath) => [
    "node",
    path.join(ifTranspilerPath, "if-transpiler.js"),
    "--inline",
    "-o",
    modifiedPath,
    originalPath,
  ]);

const setupCode = `
var $Γ = { global: { scope: null, Σ: 0 } };
var _$tmp, $tmp, $rf;

$Γ["global"]["window"] = $Γ["global"].$this = $Γ["global"];

var $Λ = [{ l: 0, id: "global" }];
var $Δ = [];
function $pc() {
  return $Λ[$Λ.length - 1];
}
function $lub() {
  var args = Array.prototype.slice.call(arguments, 0);
  return args.sort(function (a, b) {
    return b - a;
  })[0];
}

function $scope($$cs, $var, isLHS) {
  do {
    if ($$cs[$var] !== undefined) return $$cs;
  } while (($$cs = $$cs.scope));

  if (isLHS) {
    $Γ["global"][$var] = 0;
    return $Γ["global"];
  } else {
    if ($var == "global") return $Γ;

    throw new Error("Can't find variable " + $var + " in scope chain ");
  }
}

function $prop(obj, prop, $$cs) {
  var $ro, $t;
  $ro = $t = $scope($$cs, obj, false)[obj];
  do {
    if ($ro[prop] !== undefined) return $ro[prop];
  } while (($ro = $ro["__$proto__"]));

  return $t.Σ ? $t.Σ : $t;
}

function $comp(lblObj, lvl) {
  var i = $Λ.length - 1;
  while (i > 1 && $Λ[i].id !== lblObj.lbl) {
    i--;
    $Λ[i].l = $Λ[i].l > lvl ? $Λ[i].l : lvl;
  }
  i--;
  $Λ[i].l = $Λ[i].l > lvl ? $Λ[i].l : lvl;
}

function $upgrade(varArray, lvl, $$cs) {
  var variable;
  for (var e in varArray) {
    var i = varArray[e].indexOf(".");
    try {
      if (i == -1) {
        variable = $scope($$cs, varArray[e], false)[varArray[e]];
        variable instanceof Object
          ? (variable.Σ = variable.Σ >= lvl ? variable.Σ : lvl)
          : ($scope($$cs, varArray[e], false)[varArray[e]] =
              variable >= lvl ? variable : lvl);
      } else {
        var obj = varArray[e].split(".")[0],
          prop = varArray[e].split(".")[1];
        variable = $prop(obj, prop, $$cs);
        variable instanceof Object
          ? (variable.Σ = variable.Σ >= lvl ? variable.Σ : lvl)
          : ($scope($$cs, obj, false)[obj][prop] =
              variable >= lvl ? variable : lvl);
      }
    } catch (e) {}
  }
}

function sec_lvl(obj, prop, getValue, $$cs) {
  var result;

  if (obj === "this") {
    obj = prop;
    prop = null;
  }
  if (prop !== null) {
    result = $prop(obj, "" + prop, $$cs);
  } else {
    result = $scope($$cs, obj, false)[obj];
  }
  if (getValue) {
    return result instanceof Object ? result.Σ : result;
  } else {
    return result;
  }
}
`;
