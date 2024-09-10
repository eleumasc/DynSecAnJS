var $ = require("./lib/builtin");
var env = require("./env");

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
    case "LinvailTaint":
      return collectFlowsFromLinvailTaint;
    case "JalangiTT":
      return collectFlowsFromJalangiTT;
    case "ProjectFoxhound":
      return collectFlowsFromProjectFoxhound;
    default:
      return function () {
        return null;
      };
  }
}

module.exports = selectExport();
