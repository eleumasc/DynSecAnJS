import { ESVersion } from "./ESVersion";
import { SyntaxFeature } from "./SyntaxFeature";

export interface SiteSyntax {
  documentUrl: string;
  minimumESVersion: ESVersion;
  scripts: ScriptSyntax[];
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
      importUrls: string[];
    };

export type BaseScriptSyntax = {
  type: string;
  scriptUrl: string;
} & SyntaxDetail &
  ModuleDetail;

export type ExternalScriptSyntax = BaseScriptSyntax & {
  type: "external";
};

export type InlineScriptSyntax = BaseScriptSyntax & {
  type: "inline";
} & (
    | {
        isEventHandler: false;
      }
    | ({
        isEventHandler: true;
      } & { isModule: false })
  );

export type ScriptSyntax = ExternalScriptSyntax | InlineScriptSyntax;
