import yargs from "yargs/yargs";
import { startOriginalAnalysis } from "./lib/startOriginalAnalysis";
import { startToolAnalysis } from "./lib/startToolAnalysis";
import { startMeasurement } from "./lib/startMeasurement";

yargs(process.argv.slice(2))
  .command(
    "original-analysis <sitelistPath>",
    "Start original analysis",
    (yargs) => {
      return yargs
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
      startOriginalAnalysis(argv);
    }
  )
  .command(
    "tool-analysis <toolName> <originalArchivePath>",
    "Start tool analysis",
    (yargs) => {
      return yargs
        .positional("toolName", {
          type: "string",
          demandOption: true,
        })
        .positional("originalArchivePath", {
          type: "string",
          demandOption: true,
        })
        .option("concurrencyLevel", {
          type: "number",
          default: 1,
        });
    },
    (argv) => {
      startToolAnalysis(argv);
    }
  )
  .command(
    "measurement <originalArchivePath> <toolArchivePath>",
    "Start measurement",
    (yargs) => {
      return yargs
        .positional("originalArchivePath", {
          type: "string",
          demandOption: true,
        })
        .positional("toolArchivePath", {
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
