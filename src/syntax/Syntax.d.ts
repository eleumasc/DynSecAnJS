import SyntaxFeature from "./SyntaxFeature";
import { ESVersion } from "./ESVersion";

export interface Syntax {
  navUrl: string;
  minimumESVersion: ESVersion;
  scriptUrlMap: Record<string, string>;
  scripts: SyntaxScript[];
  errors: string[];
}

export type SyntaxScript = (
  | {
      type: "external";
      url: string;
    }
  | ({
      type: "inline";
    } & (
      | {
          isEventHandler: false;
        }
      | {
          isEventHandler: true;
          isModule: false;
        }
    ))
) &
  SyntaxDetail &
  ModuleDetail & {
    id: number;
    hash: string;
  };

export type SyntaxDetail = {
  minimumESVersion: ESVersion;
  features: string[];
  astNodesCount: number;
};

export type ModuleDetail =
  | {
      isModule: false;
    }
  | {
      isModule: true;
      importUrlMap: Record<string, string>;
    };
