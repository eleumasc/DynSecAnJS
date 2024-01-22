import assert from "assert";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { deserializeLogfile } from "./lib/serialize";
import { intersect } from "./lib/util/array";
import { Logfile, SuccessAnalysisResult } from "./lib/Analysis";

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
    const { analysisResults: results } = logfile;

    if (
      !results.every(
        (result): result is SuccessAnalysisResult => result.status === "success"
      )
    ) {
      return "failure";
    }

    if (
      results.some((x, i) =>
        results.slice(i + 1).some((y) => x.featureSet.equals(y.featureSet))
      )
    ) {
      return "TRANSPARENT";
    } else {
      const commonBroken = results
        .flatMap((x, i) =>
          results.slice(i + 1).map((y) => x.featureSet.broken(y.featureSet))
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
