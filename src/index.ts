import assert from "assert";
import { cmdAnalyzeSyntax } from "./commands/cmdAnalyzeSyntax";
import { cmdCollectBrowser } from "./commands/cmdCollectBrowser";
import { cmdRecord } from "./commands/cmdRecord";
import { isBrowserName } from "./collection/BrowserName";
import path from "path";
import yargs from "yargs/yargs";

const workspacePath = path.resolve("workspace");

yargs(process.argv.slice(2))
  .command(
    "record <sitelistPath>",
    "",
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
    ({ sitelistPath, workingDirectory, concurrencyLimit }) => {
      cmdRecord({
        type: "normal",
        requireArgs: {
          sitelistPath,
          workingDirectory,
        },
        processArgs: {
          concurrencyLimit,
        },
      });
    }
  )
  .command(
    "record:resume <archivePath>",
    "",
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
    ({ archivePath, concurrencyLimit }) => {
      cmdRecord({
        type: "resume",
        archivePath,
        processArgs: {
          concurrencyLimit,
        },
      });
    }
  )
  .command(
    "analyzeSyntax <recordArchivePath>",
    "",
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
    ({ recordArchivePath, concurrencyLimit }) => {
      cmdAnalyzeSyntax({
        type: "normal",
        requireArgs: {
          recordArchivePath,
        },
        processArgs: {
          concurrencyLimit,
        },
      });
    }
  )
  .command(
    "collectBrowser <browserName> <analyzeSyntaxArchivePath>",
    "",
    (yargs) => {
      return yargs
        .positional("browserName", {
          type: "string",
          demandOption: true,
        })
        .positional("analyzeSyntaxArchivePath", {
          type: "string",
          demandOption: true,
        })
        .option("concurrencyLimit", {
          type: "number",
          default: 1,
        });
    },
    ({ browserName, analyzeSyntaxArchivePath, concurrencyLimit }) => {
      assert(
        isBrowserName(browserName),
        `Invalid browser name: ${browserName}`
      );
      cmdCollectBrowser({
        type: "normal",
        requireArgs: {
          browserName,
          analyzeSyntaxArchivePath,
        },
        processArgs: {
          concurrencyLimit,
        },
      });
    }
  )
  .strictCommands()
  .demandCommand(1)
  .parse();
