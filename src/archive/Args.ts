
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

export type Args<TRequireArgs, TProcessArgs> = NormalArgs<TRequireArgs, TProcessArgs> |
  ResumeArgs<TProcessArgs>;
