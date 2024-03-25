import { startCompatibility } from "./lib/startCompatibility";
import { startOriginalAnalysis } from "./lib/startOriginalAnalysis";
import { startToolAnalysis } from "./lib/startToolAnalysis";
import { startTransparency } from "./lib/startTransparency";
import yargs from "yargs/yargs";

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
        .option("intersectSitelistPath", {
          type: "string",
          demandOption: false,
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
    "compatibility <originalArchivePath>",
    "Start compatibility measurement",
    (yargs) => {
      return yargs.positional("originalArchivePath", {
        type: "string",
        demandOption: true,
      });
    },
    (argv) => {
      startCompatibility(argv);
    }
  )
  .command(
    "transparency <originalArchivePath> <toolArchivePath>",
    "Start transparency measurement",
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
      startTransparency(argv);
    }
  )
  .strictCommands()
  .demandCommand(1)
  .parse();
