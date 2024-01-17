import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Logfile } from "./model";
import { deserializeLogfile } from "./lib/serialize";
import assert from "assert";

const main = async () => {
  const analysisId = process.argv[2];
  assert(analysisId, "Missing analysisId (@2)");

  const outDir = join("results", analysisId);
  const logfiles = readdirSync(outDir).map((filename): Logfile => {
    return deserializeLogfile(
      JSON.parse(readFileSync(join(outDir, filename)).toString())
    );
  });

  const assessTransparency = (logfile: Logfile): string => {
    const { chromium1, chromium2 } = logfile;

    if (chromium1.status !== "success" || chromium2.status !== "success") {
      return "failure";
    }

    if (chromium1.featureSet.equals(chromium2.featureSet)) {
      return "TRANSPARENT";
    } else {
      return "NON-transparent";
    }
  };

  console.table(
    logfiles.map((logfile) => [logfile.site, assessTransparency(logfile)])
  );
};

main();
