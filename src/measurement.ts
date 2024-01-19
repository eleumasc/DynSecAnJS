import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Logfile, SuccessAnalysisResult } from "./model";
import { deserializeLogfile } from "./lib/serialize";
import assert from "assert";
import { intersect } from "./lib/util/array";

const main = async () => {
  const analysisId = process.argv[2];
  assert(analysisId, "Missing analysisId (@2)");

  const outDir = join("results", analysisId);
  const logfiles = readdirSync(outDir).map((filename): Logfile => {
    return deserializeLogfile(
      JSON.parse(readFileSync(join(outDir, filename)).toString())
    );
  });

  const assessTransparency = (logfile: Logfile): string | string[] => {
    const { analysisResults } = logfile;

    if (
      !analysisResults.every(
        (analysisResult): analysisResult is SuccessAnalysisResult =>
          analysisResult.status === "success"
      )
    ) {
      return "failure";
    }

    const half = analysisResults.length >> 1;
    const fstGroup = analysisResults.slice(0, half);
    const sndGroup = analysisResults.slice(half);

    if (
      fstGroup.some((fst) =>
        sndGroup.some((snd) => fst.featureSet.equals(snd.featureSet))
      )
    ) {
      return "TRANSPARENT";
    } else {
      const commonBroken = fstGroup
        .flatMap((fst) =>
          sndGroup.map((snd) => fst.featureSet.broken(snd.featureSet))
        )
        .reduce((acc: string[] | null, cur: string[]): string[] => {
          if (!acc) {
            return cur;
          }
          return intersect(acc, cur);
        }, null);
      return "NON-transparent: " + JSON.stringify(commonBroken);
    }
  };

  console.table(
    logfiles.map((logfile) => [logfile.site, assessTransparency(logfile)])
  );
};

main();
