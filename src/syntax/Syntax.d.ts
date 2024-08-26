import { ESVersion } from "./ESVersion";
import SyntaxFeature from "./SyntaxFeature";

export interface Syntax {
  mainUrl: string;
  minimumESVersion: ESVersion;
  scriptUrlMap: Record<string, string>;
  scripts: SyntaxScript[];
  errors: string[];
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
      importUrlMap: Record<string, string>;
    };

export type BaseSyntaxScript = {
  type: string;
} & SyntaxDetail &
  ModuleDetail;

export type ExternalSyntaxScript = BaseSyntaxScript & {
  type: "external";
  url: string;
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
