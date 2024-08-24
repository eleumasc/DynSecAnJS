import { startCompatibility } from "./commands/startCompatibility";
import { cmdCollectBrowser } from "./commands/cmdCollectBrowser";
import { startSitelistRecovery } from "./commands/startSitelistRecovery";
import { startToolAnalysis } from "./commands/startToolAnalysis";
import {
  ArchivePathRecord,
  TransparencyArgs,
  startTransparency,
} from "./commands/startTransparency";
import yargs from "yargs/yargs";
import { cmdRecord } from "./commands/cmdRecord";
import { cmdPrepare } from "./commands/cmdPrepare";
import path from "path";

const workspacePath = path.resolve("workspace");

yargs(process.argv.slice(2))
  .command(
    "record <sitelistPath>",
    "Record",
    (yargs) => {
      return yargs
        .positional("sitelistPath", {
          type: "string",
          demandOption: true,
        })
        .option("workingDirectory", {
          type: "string",
          default: workspacePath,
        })
        .option("concurrencyLimit", {
          type: "number",
          default: 1,
        });
    },
    (argv) => {
      cmdRecord({
        type: "normal",
        requireArgs: {
          sitelistPath: argv.sitelistPath,
          workingDirectory: argv.workingDirectory,
        },
        processArgs: {
          concurrencyLimit: argv.concurrencyLimit,
        },
      });
    }
  )
  .command(
    "record:resume <archivePath>",
    "Resume Record",
    (yargs) => {
      return yargs
        .positional("archivePath", {
          type: "string",
          demandOption: true,
        })
        .option("concurrencyLimit", {
          type: "number",
          default: 1,
        });
    },
    (argv) => {
      cmdRecord({
        type: "resume",
        archivePath: argv.archivePath,
        processArgs: {
          concurrencyLimit: argv.concurrencyLimit,
        },
      });
    }
  )
  .command(
    "prepare <recordArchivePath>",
    "Prepare",
    (yargs) => {
      return yargs
        .positional("recordArchivePath", {
          type: "string",
          demandOption: true,
        })
        .option("concurrencyLimit", {
          type: "number",
          default: 1,
        });
    },
    (argv) => {
      cmdPrepare({
        type: "normal",
        requireArgs: {
          recordArchivePath: argv.recordArchivePath,
        },
        processArgs: {
          concurrencyLimit: argv.concurrencyLimit,
        },
      });
    }
  )
  .command(
    "prepare:resume <archivePath>",
    "Resume Prepare",
    (yargs) => {
      return yargs
        .positional("archivePath", {
          type: "string",
          demandOption: true,
        })
        .option("concurrencyLimit", {
          type: "number",
          default: 1,
        });
    },
    (argv) => {
      cmdPrepare({
        type: "resume",
        archivePath: argv.archivePath,
        processArgs: {
          concurrencyLimit: argv.concurrencyLimit,
        },
      });
    }
  )
  .command(
    "collect:original <browserName> <sitelistPath>",
    "Collect original",
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
        .option("concurrencyLimit", {
          type: "number",
          default: 1,
        });
    },
    (argv) => {
      cmdCollectBrowser(argv);
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
