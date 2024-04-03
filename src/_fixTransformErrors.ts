import { ExecutionDetail, TransformErrorDetail } from "./lib/ExecutionDetail";
import { Fallible, isFailure } from "./core/Fallible";
import {
  ToolAnalysisResult,
  deserializeToolAnalysisResult,
} from "./lib/ToolAnalysis";

import ArchiveReader from "./lib/ArchiveReader";
import { Logfile } from "./lib/Logfile";
import assert from "assert";
import path from "path";
import { writeFileSync } from "fs";

type FixTarget = TransformErrorDetail | string;

const fixTransformError = (fixTarget: FixTarget): TransformErrorDetail => {
  if (typeof fixTarget === "object") {
    return fixTarget;
  }

  assert(fixTarget[0] === "[");
  const urlEndIndex = fixTarget.indexOf("] ");
  assert(urlEndIndex !== -1);
  const url = fixTarget.substring(1, urlEndIndex);
  const transformNameStartIndex = urlEndIndex + 2;
  const transformNameEndIndex = fixTarget.indexOf(
    ": ",
    transformNameStartIndex
  );
  assert(transformNameEndIndex !== -1);
  const transformName = fixTarget.substring(
    transformNameStartIndex,
    transformNameEndIndex
  );
  assert(transformName !== "Babel.js");
  const messageStartIndex = transformNameEndIndex + 2;
  const message = fixTarget.substring(messageStartIndex);

  return {
    transformName: transformName === "Babel" ? "Babel" : "Tool",
    url,
    message,
  };
};

const fixToolExecution = (
  fallibleExecution: Fallible<ExecutionDetail>
): Fallible<ExecutionDetail> => {
  if (isFailure(fallibleExecution)) {
    return fallibleExecution;
  }
  const { val: execution } = fallibleExecution;
  return {
    status: "success",
    val: {
      ...execution,
      transformErrors: execution.transformErrors.map((transformError) =>
        fixTransformError(transformError)
      ),
    },
  };
};

const fixLogfileData = (
  data: Fallible<ToolAnalysisResult>
): Fallible<ToolAnalysisResult> => {
  if (isFailure(data)) {
    return data;
  }
  const { val: toolAnalysisResult } = data;
  return {
    status: "success",
    val: {
      ...toolAnalysisResult,
      toolExecutions: toolAnalysisResult.toolExecutions.map(
        (fallibleExecution) => fixToolExecution(fallibleExecution)
      ),
    },
  };
};

const fixLogfile = (
  logfile: Logfile<"tool-analysis", ToolAnalysisResult>
): Logfile<"tool-analysis", ToolAnalysisResult> => {
  return {
    ...logfile,
    data: fixLogfileData(logfile.data),
  };
};

const main = async () => {
  const toolArchivePath = path.resolve(process.argv[2]);

  const toolArchive = new ArchiveReader(
    toolArchivePath,
    "tool-analysis",
    deserializeToolAnalysisResult
  );
  const toolSitelist = toolArchive.getSitelist();

  for (const site of toolSitelist) {
    const logfile = toolArchive.load(site);
    fixLogfile(logfile);
  }
  console.log("CHECK OK");

  for (const site of toolSitelist) {
    const logfile = toolArchive.load(site);
    const fixedLogfile = fixLogfile(logfile);
    writeFileSync(
      path.join(toolArchivePath, `${site}.json`),
      JSON.stringify(fixedLogfile)
    );
  }
  console.log("THE END");
};

main();
