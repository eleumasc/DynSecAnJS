import assert from "assert";
import path from "path";
import yargs from "yargs/yargs";
import { cmdCollect } from "./commands/cmdCollect";
import { cmdMeasure } from "./commands/cmdMeasure";
import { cmdPreanalyze } from "./commands/cmdPreanalyze";
import { cmdRecord } from "./commands/cmdRecord";
import { isBrowserName } from "./collection/BrowserName";
import { isToolName } from "./collection/ToolName";

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
    "preanalyze <recordArchivePath>",
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
      cmdPreanalyze({
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
    "collect <browserOrToolName> <preanalyzeArchivePath>",
    "",
    (yargs) => {
      return yargs
        .positional("browserOrToolName", {
          type: "string",
          demandOption: true,
        })
        .positional("preanalyzeArchivePath", {
          type: "string",
          demandOption: true,
        })
        .option("concurrencyLimit", {
          type: "number",
          default: 1,
        });
    },
    ({ browserOrToolName, preanalyzeArchivePath, concurrencyLimit }) => {
      assert(
        isBrowserName(browserOrToolName) || isToolName(browserOrToolName),
        `Invalid browser or tool name: ${browserOrToolName}`
      );
      cmdCollect({
        type: "normal",
        requireArgs: {
          browserOrToolName,
          preanalyzeArchivePath,
        },
        processArgs: {
          concurrencyLimit,
        },
      });
    }
  )
  .command(
    "collect:resume <archivePath>",
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
      cmdCollect({
        type: "resume",
        archivePath,
        processArgs: {
          concurrencyLimit,
        },
      });
    }
  )
  .command(
    "measure <preanalyzeArchivePath>",
    "",
    (yargs) => {
      return yargs
        .positional("preanalyzeArchivePath", {
          type: "string",
          demandOption: true,
        })
        .option("collect", {
          type: "array",
        })
        .option("matchingFlowsPath", {
          type: "string",
        });
    },
    ({
      preanalyzeArchivePath,
      collect: collectArchivePaths,
      matchingFlowsPath,
    }) => {
      cmdMeasure({
        type: "normal",
        requireArgs: {
          preanalyzeArchivePath,
          collectArchivePaths: collectArchivePaths?.map(String) ?? [],
        },
        processArgs: {
          matchingFlowsPath,
        },
      });
    }
  )
  .strictCommands()
  .demandCommand(1)
  .parse();
