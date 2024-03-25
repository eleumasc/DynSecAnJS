import { ESVersion } from "./ESVersion";

export interface CompatibilityDetail {
  pageUrl: string;
  minimumESVersion: ESVersion;
  scripts: ScriptDetail[];
}

export interface Category {
  name: string;
  esVersion: ESVersion;
}

export interface ScriptDetail {
  kind: string;
  minimumESVersion: ESVersion;
  categories: Category[];
}

export interface ExternalScriptDetail extends ScriptDetail {
  kind: "external";
  url: string;
}

export interface InlineScriptDetail extends ScriptDetail {
  kind: "inline";
  isEventHandler: boolean;
}
