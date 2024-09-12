var $ = require("./lib/builtin");
var env = require("./env");

function collectFlowsFromIFTranspiler() {
  return $.global["_ifTranspiler_taintReports_"];
}

function collectFlowsFromLinvailTaint() {
  return $.global["_aran_taintReports_"];
}

function collectFlowsFromJalangiTT() {
  return $.global["__ytjs_getTrackingResult"]();
}

function collectFlowsFromProjectFoxhound() {
  return $.global["$__taintReports"];
}

function selectExport() {
  switch (env.toolName) {
    case "IF-Transpiler":
      return collectFlowsFromIFTranspiler;
    case "LinvailTaint":
      return collectFlowsFromLinvailTaint;
    case "JalangiTT":
      return collectFlowsFromJalangiTT;
    case "ProjectFoxhound":
      return collectFlowsFromProjectFoxhound;
    case "JEST":
    default:
      return function () {
        return null;
      };
  }
}

module.exports = selectExport();
