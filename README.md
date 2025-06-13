# DynSecAnJS (Dynamic Security Analysis of JavaScript)

A framework for automated evaluation of tools for dynamic information flow analysis of JavaScript.

## System requirements

- Ubuntu 22.04 LTS
- Node.js 20 or above

## Setup

1. Build the default toolset: https://github.com/eleumasc/DynSecAnJS-tools
2. Clone this repository: `git clone https://github.com/eleumasc/DynSecAnJS && cd DynSecAnJS`
3. Install the dependencies: `npm i`
4. Install Playwright: `npx playwright install`
5. Build: `npm run build`
6. Copy `.env.example` into `.env`: `cp .env.example .env`; then, set the value of `TOOLS_PATH` to the path to `DynSecAnJS-tools` (see step 1)

## How to use

The framework performs the analysis in stages. Each stage generates an archive directory, which serves as the input for the subsequent stages.

In the following, execute each command by running `npm run start -- <command>`.

1. Create a site list file, that is a JSON file containing an array of domain strings (e.g., `["foo.com","bar.com"]`). You can store the site list file wherever you want. Anyway, we suggest to store it into a subdirectory called `sitelists` (ignored by git).
2. Execute the command `record /path/to/sitelist.json` to record an execution for each domain in the site list file created at step 1. This command generates an archive directory called `Record-[0-9]+`.
3. Execute the command `preanalyze /path/to/Record-[0-9]+` to pre-analyze the executions recorded at step 2, in particular parsing the scripts and computing their syntactic compatility. This command generates an archive directory called `Preanalyze-[0-9]+`.
4. Execute the command `collect <browserOrToolName> /path/to/Preanalyze-[0-9]+` to replay the executions pre-analyzed at step 3 in the browser or tool specified by `browserOrToolName` and collect data about those replayed executions. The list of browsers and tools for `browserOrToolName` is available in [BrowserName.ts](src/collection/BrowserName.ts) and [ToolName.ts](src/collection/ToolName.ts), respectively. This command generates an archive directory called `Collect-<browserOrToolName>-[0-9]+`. Repeat this step for every available browser and tool.
5. Execute the command `measure /path/to/Preanalyze-[0-9]+ --collect /path/to/Collect-<browserOrToolName1>-[0-9]+ ... --collect /path/to/Collect-<browserOrToolNameN>-[0-9]+` to perform the measurement using the collect archives created at step 4. It is required that all the collect archives specified must derive from the preanalyze archive specified. Moreover, if a collect archive referred to some tool is specified, then a collect archive referred to the original browser associated to that tool must be specified as well, according to the mapping available in [ToolName.ts](src/collection/ToolName.ts) (`getBrowserNameByToolName` function). This command generates a report JSON file containing aggregate data for the analysis of compatibility, transparency, coverage (limited to information flow analysis), and performance.

Useful tips:

- The archive directories are stored by default into the `workspace` subdirectory (ignored by git). You can change this location by specifying the `--workingDirectory <path>` option.
- The `--concurrencyLimit <n>` option for the `record`, `preanalyze`, and `collect` commands allows the analysis of up to `n` domains concurrently.
- Analyses initiated by the `record` or `collect` command can be resumed after an interruption by running `<command>:resume <archivePath>`, where `archivePath` is the archive of the analysis to be resumed.
- Execute a command with the `--help` option to print the command usage.

## Support

Feel free to open an issue or send a pull request. We will try to sort it as soon as possible.
