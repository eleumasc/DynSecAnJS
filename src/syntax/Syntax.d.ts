import { ESVersion } from "./ESVersion";
import SyntaxFeature from "./SyntaxFeature";

export interface Syntax {
  documentUrl: string;
  minimumESVersion: ESVersion;
  scripts: SyntaxScript[];
}

export type SyntaxDetail = {
  minimumESVersion: ESVersion;
  features: string[];
};

export type ModuleDetail =
  | {
      isModule: false;
    }
  | {
      isModule: true;
      moduleDeps: Record<string, string>;
    };

export type BaseSyntaxScript = {
  type: string;
} & SyntaxDetail &
  ModuleDetail;

export type ExternalSyntaxScript = BaseSyntaxScript & {
  type: "external";
  url: string;
  dynamicLoading: boolean;
};

export type InlineSyntaxScript = BaseSyntaxScript & {
  type: "inline";
  hash: string;
} & (
    | {
        isEventHandler: false;
      }
    | ({
        isEventHandler: true;
      } & { isModule: false })
  );

export type SyntaxScript = ExternalSyntaxScript | InlineSyntaxScript;
