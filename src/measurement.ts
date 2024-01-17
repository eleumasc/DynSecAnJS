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
};

main();
