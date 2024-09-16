import Archive, { ArchiveConstructor } from "./Archive";
import assert from "assert";
import path from "path";
import { Args } from "./Args";
import { isSuccess } from "../util/Completion";
import { Logfile } from "./Logfile";
import { unixTime } from "../util/time";
import {
  SitesState,
  createSitesState,
  getProcessedSitesInSitesState,
} from "./SitesState";

export interface InitCommandController<TLogfile extends Logfile, TRequireArgs> {
  getPrefix(requireArgs: TRequireArgs): string;
  createLogfile(requireArgs: TRequireArgs): TLogfile;
}

export interface InitCommandResult<
  TLogfile extends Logfile,
  TSiteData,
  TProcessArgs
> {
  archive: Archive<TLogfile, TSiteData>;
  processArgs: TProcessArgs;
  resolveArchivePath: ResolveArchivePathCallback;
}

export type ResolveArchivePathCallback = (archiveName: string) => string;

export const initCommand = <
  TLogfile extends Logfile,
  TSiteData,
  TRequireArgs,
  TProcessArgs
>(
  args: Args<TRequireArgs, TProcessArgs>,
  archiveConstructor: ArchiveConstructor<TLogfile, TSiteData>,
  controller: InitCommandController<TLogfile, TRequireArgs>
): InitCommandResult<TLogfile, TSiteData, TProcessArgs> => {
  const { type: argsType, processArgs } = args;

  const logArchivePath = (archivePath: string) => {
    console.log(`Archive path: ${archivePath}`);
  };

  if (argsType === "normal") {
    const { requireArgs } = args;
    const archivePath = path.resolve(
      `${controller.getPrefix(requireArgs)}-${unixTime()}`
    );
    const archive = archiveConstructor.init<TLogfile, TSiteData>(
      archivePath,
      controller.createLogfile(requireArgs)
    );

    logArchivePath(archivePath);

    return {
      archive,
      processArgs,
      resolveArchivePath: createResolveArchivePathCallback(archivePath),
    };
  } else if (argsType === "resume") {
    const { archivePath } = args;
    const archive = archiveConstructor.open(archivePath, true);

    logArchivePath(archivePath);

    return {
      archive,
      processArgs,
      resolveArchivePath: createResolveArchivePathCallback(archivePath),
    };
  } else {
    throw new Error(`Unknown type of Args: ${argsType}`); // This should never happen
  }
};

const createResolveArchivePathCallback = (
  thisArchivePath: string
): ResolveArchivePathCallback => {
  const workingDirectory = path.dirname(thisArchivePath);
  return (archiveName: string) => path.resolve(workingDirectory, archiveName);
};

export class ChildInitCommandController<
  TLogfile extends Logfile,
  TParentLogfile extends Logfile,
  TParentSiteData,
  TRequireArgs
> implements InitCommandController<TLogfile, TRequireArgs>
{
  protected _parentArchivePath: string | undefined;

  constructor(
    readonly parentArchiveConstructor: ArchiveConstructor<
      TParentLogfile,
      TParentSiteData
    >,
    readonly getParentArchivePath: (requireArgs: TRequireArgs) => string,
    readonly getArchiveName: (requireArgs: TRequireArgs) => string,
    readonly createChildLogfile: (
      requireArgs: TRequireArgs,
      args: {
        parentArchive: Archive<TParentLogfile>;
        parentArchiveName: string;
        sitesState: SitesState;
      }
    ) => TLogfile
  ) {}

  getPrefix(requireArgs: TRequireArgs): string {
    const parentArchivePath = (this._parentArchivePath =
      this.getParentArchivePath.call(null, requireArgs));
    return path.join(
      path.dirname(path.resolve(parentArchivePath)),
      this.getArchiveName.call(null, requireArgs)
    );
  }

  createLogfile(requireArgs: TRequireArgs): TLogfile {
    const { _parentArchivePath: parentArchivePath } = this;
    assert(parentArchivePath !== undefined);

    const parentArchiveName = path.basename(parentArchivePath);
    const parentArchive = this.parentArchiveConstructor.open(parentArchivePath);

    const sitesState = createSitesState(
      getProcessedSitesInSitesState(parentArchive.logfile.sitesState).filter(
        (site) => isSuccess(parentArchive.readSiteResult(site))
      )
    );

    return this.createChildLogfile.call(null, requireArgs, {
      parentArchive,
      parentArchiveName,
      sitesState,
    });
  }
}
