import assert from "assert";
import { join } from "path";
import { AbstractSession } from "./AbstractSession";

export const loadSessionFromConfigModule = (
  configName: string
): AbstractSession<any> => {
  const configPath = join(__dirname, "config", `${configName}.config`);
  const session = require(configPath).default;

  assert(
    session instanceof AbstractSession,
    "Config module should export by default an instance of AbstractSession"
  );

  return session;
};
