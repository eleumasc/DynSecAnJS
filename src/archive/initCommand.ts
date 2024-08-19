import Archive from "./Archive";
import { Logfile } from "./Logfile";
import _ from "lodash";
import path from "path";
import { unixTime } from "../util/time";

export interface BaseArgs<TProcessArgs> {
  type: string;
  processArgs: TProcessArgs;
}

export interface NormalArgs<TDepsArgs, TProcessArgs>
  extends BaseArgs<TProcessArgs> {
  type: "normal";
  depsArgs: TDepsArgs;
  processArgs: TProcessArgs;
}

export interface ResumeArgs<TProcessArgs> extends BaseArgs<TProcessArgs> {
  type: "resume";
  archivePath: string;
}

export type Args<TDepsArgs, TProcessArgs> =
  | NormalArgs<TDepsArgs, TProcessArgs>
  | ResumeArgs<TProcessArgs>;

export interface InitCommandResult<
  TLogfile extends Logfile,
  TDeps,
  TProcessArgs
> {
  archive: Archive<TLogfile>;
  deps: TDeps;
  processArgs: TProcessArgs;
  workingDirectory: string;
}

export const initCommand =
  <TLogfile extends Logfile>() =>
  <TDeps, TDepsArgs, TProcessArgs>(
    args: Args<TDepsArgs, TProcessArgs>,
    getPrefix: (depsArgs: TDepsArgs) => string,
    createLogfile: () => TLogfile,
    createDeps: (depsArgs: TDepsArgs) => TDeps
  ): InitCommandResult<TLogfile, TDeps, TProcessArgs> => {
    const { type: argsType, processArgs } = args;

    const logArchivePath = (archivePath: string) => {
      console.log(`Archive path: ${archivePath}`);
    };

    if (argsType === "normal") {
      const { depsArgs } = args;

      const archivePath = path.resolve(`${getPrefix(depsArgs)}-${unixTime()}`);

      const archive = Archive.init(path.resolve(archivePath), createLogfile());

      const deps = createDeps(depsArgs);
      archive.writeData("deps.json", deps);

      logArchivePath(archivePath);

      return {
        archive,
        deps,
        processArgs,
        workingDirectory: path.dirname(archivePath),
      };
    } else if (argsType === "resume") {
      const { archivePath } = args;

      const archive = Archive.open<TLogfile>(path.resolve(archivePath), true);

      const deps = archive.readData<TDeps>("deps.json");

      logArchivePath(archivePath);

      return {
        archive,
        deps,
        processArgs,
        workingDirectory: path.dirname(archivePath),
      };
    }

    throw new Error(`Unknown type of Args: ${argsType}`); // This should never happen
  };

export const getPrefixFromArchivePath = (archivePath: string, name: string) =>
  path.join(path.dirname(path.resolve(archivePath)), name);
