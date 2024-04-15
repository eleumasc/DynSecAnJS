import { startCompatibility } from "./starters/startCompatibility";
import { startOriginalAnalysis } from "./starters/startOriginalAnalysis";
import { startSitelistRecovery } from "./starters/startSitelistRecovery";
import { startToolAnalysis } from "./starters/startToolAnalysis";
import {
  ArchivePathRecord,
  TransparencyArgs,
  startTransparency,
} from "./starters/startTransparency";
import yargs from "yargs/yargs";

yargs(process.argv.slice(2))
  .command(
    "original-analysis <browserName> <sitelistPath>",
    "Start original analysis",
    (yargs) => {
      return yargs
        .positional("browserName", {
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
        })
        .option("preAnalysis", {
          type: "boolean",
          default: false,
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
      return yargs
        .positional("originalArchivePath", {
          type: "string",
          demandOption: true,
        })
        .option("intersectSitelistPath", {
          type: "string",
          demandOption: false,
        });
    },
    (argv) => {
      startCompatibility(argv);
    }
  )
  .command(
    "transparency",
    "Start transparency measurement",
    (yargs) => {
      return yargs
        .option("in", {
          type: "string",
          array: true,
          demandOption: true,
          nargs: 2,
        })
        .option("intersectSitelistPath", {
          type: "string",
          demandOption: false,
        });
    },
    (argv) => {
      const { in: inputArray, intersectSitelistPath } = argv;
      const archivePathRecords: ArchivePathRecord[] = [];
      for (let i = 0; i < inputArray.length; i += 2) {
        archivePathRecords.push({
          originalArchivePath: inputArray[i],
          toolArchivePath: inputArray[i + 1],
        });
      }

      startTransparency(<TransparencyArgs>{
        archivePathRecords,
        intersectSitelistPath,
      });
    }
  )
  .command(
    "sitelist-recovery <sitelistPath> <archivePath> <diffSitelistPath>",
    "Start sitelist recovery",
    (yargs) => {
      return yargs
        .positional("sitelistPath", {
          type: "string",
          demandOption: true,
        })
        .positional("archivePath", {
          type: "string",
          demandOption: true,
        })
        .positional("diffSitelistPath", {
          type: "string",
          demandOption: true,
        });
    },
    (argv) => startSitelistRecovery(argv)
  )
  .strictCommands()
  .demandCommand(1)
  .parse();
