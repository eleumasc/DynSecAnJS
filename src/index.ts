import yargs from "yargs/yargs";
import { startAnalysis } from "./lib/startAnalysis";
import { startMeasurement } from "./lib/startMeasurement";

yargs(process.argv.slice(2))
  .command(
    "analysis <toolName> <sitelistPath>",
    "Start analysis",
    (yargs) => {
      return yargs
        .positional("toolName", {
          type: "string",
          demandOption: true,
        })
        .positional("sitelistPath", {
          type: "string",
          demandOption: true,
        })
        .option("concurrencyLevel", {
          type: "number",
          default: 1,
        });
    },
    (argv) => {
      startAnalysis(argv);
    }
  )
  .command(
    "measurement <archivePath>",
    "Start measurement",
    (yargs) => {
      return yargs.positional("archivePath", {
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
