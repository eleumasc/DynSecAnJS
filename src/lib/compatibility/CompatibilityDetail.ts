import { ESVersion } from "./ESVersion";

export interface CompatibilityDetail {
  minimumESVersion: ESVersion;
  scripts: ScriptDetail[];
}

export interface ScriptDetail {
  kind: string;
  evidences: string[];
  minimumESVersion: ESVersion;
}

export interface ExternalScriptDetail extends ScriptDetail {
  kind: "external";
  url: string;
}

export interface InlineScriptDetail extends ScriptDetail {
  kind: "inline";
}

export const serializeCompatibilityDetail = (
  cooked: CompatibilityDetail
): any => {
  return cooked;
};

export const deserializeCompatibilityDetail = (
  raw: any
): CompatibilityDetail => {
  return raw;
};
