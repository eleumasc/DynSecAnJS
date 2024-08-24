import Archive from "./Archive";
import { Logfile } from "./Logfile";
import assert from "assert";
import path from "path";
import { unixTime } from "../util/time";

export interface BaseArgs<TProcessArgs> {
  type: string;
  processArgs: TProcessArgs;
}

export interface NormalArgs<TRequireArgs, TProcessArgs>
  extends BaseArgs<TProcessArgs> {
  type: "normal";
  requireArgs: TRequireArgs;
  processArgs: TProcessArgs;
}

export interface ResumeArgs<TProcessArgs> extends BaseArgs<TProcessArgs> {
  type: "resume";
  archivePath: string;
}

export type Args<TRequireArgs, TProcessArgs> =
  | NormalArgs<TRequireArgs, TProcessArgs>
  | ResumeArgs<TProcessArgs>;

type RequireArchive = <TLogfile extends Logfile>(
  name: string,
  type: TLogfile["type"]
) => {
  archive: Archive<TLogfile>;
  archivePath: string;
};

const createRequireArchive = (thisArchivePath: string): RequireArchive => {
  const workingDirectory = path.dirname(thisArchivePath);

  return <TLogfile extends Logfile>(name: string, type: string) => {
    const archivePath = path.resolve(workingDirectory, name);
    const archive = Archive.open<TLogfile>(archivePath);
    assert(archive.logfile.type === type);
    return { archive, archivePath };
  };
};

export interface InitCommandResult<TLogfile extends Logfile, TProcessArgs> {
  archive: Archive<TLogfile>;
  processArgs: TProcessArgs;
  requireArchive: RequireArchive;
}

export const initCommand = <
  TLogfile extends Logfile,
  TRequireArgs,
  TProcessArgs
>(
  args: Args<TRequireArgs, TProcessArgs>,
  getPrefix: (requireArgs: TRequireArgs) => string,
  createLogfile: (requireArgs: TRequireArgs) => TLogfile
): InitCommandResult<TLogfile, TProcessArgs> => {
  const { type: argsType, processArgs } = args;

  const logArchivePath = (archivePath: string) => {
    console.log(`Archive path: ${archivePath}`);
  };

  if (argsType === "normal") {
    const { requireArgs } = args;
    const archivePath = path.resolve(`${getPrefix(requireArgs)}-${unixTime()}`);
    const archive = Archive.init(archivePath, createLogfile(requireArgs));

    logArchivePath(archivePath);

    return {
      archive,
      processArgs,
      requireArchive: createRequireArchive(archivePath),
    };
  } else if (argsType === "resume") {
    const { archivePath } = args;
    const archive = Archive.open<TLogfile>(archivePath, true);

    logArchivePath(archivePath);

    return {
      archive,
      processArgs,
      requireArchive: createRequireArchive(archivePath),
    };
  }

  throw new Error(`Unknown type of Args: ${argsType}`); // This should never happen
};

export const getPrefixFromArchivePath = (archivePath: string, name: string) =>
  path.join(path.dirname(path.resolve(archivePath)), name);
