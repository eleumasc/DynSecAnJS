import yargs from "yargs/yargs";
import { startAnalysis } from "./lib/startAnalysis";
import { startMeasurement } from "./lib/startMeasurement";

yargs(process.argv.slice(2))
  .command(
    "analysis <configName> <sitelistPath>",
    "Start analysis",
    (yargs) => {
      return yargs
        .positional("configName", {
          type: "string",
          demandOption: true,
        })
        .positional("sitelistPath", {
          type: "string",
          demandOption: true,
        });
    },
    (argv) => {
      startAnalysis(argv);
    }
  )
  .command(
    "measurement <configName> <analysisId>",
    "Start measurement",
    (yargs) => {
      return yargs
        .positional("configName", {
          type: "string",
          demandOption: true,
        })
        .positional("analysisId", {
          type: "string",
          demandOption: true,
        });
    },
    (argv) => {
      startMeasurement(argv);
    }
  )
  .strictCommands()
  .demandCommand(1)
  .parse();
