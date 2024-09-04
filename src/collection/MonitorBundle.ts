import browserify from "browserify";
import EnvifyCustomPlugin from "./EnvifyCustomPlugin";
import path from "path";
import { promisify } from "util";
import { ToolName } from "./ToolName";
import { useTempDirectory } from "../util/TempDirectory";
import { writeFileSync } from "fs";

const monitorDir = path.resolve("monitor");

export interface MonitorEnv {
  toolName?: ToolName;
}

export interface MonitorState {
  loadingCompleted: boolean;
  uncaughtErrors: string[];
  rawFlows: any;
}

export const useMonitorBundle = <T>(
  env: MonitorEnv,
  use: (bundlePath: string) => Promise<T>
): Promise<T> =>
  useTempDirectory(async (tempPath) => {
    const bundle = await promisify<Buffer>((callback) =>
      browserify({ basedir: monitorDir })
        .add("./index.js")
        .transform(EnvifyCustomPlugin({ ENV: env }))
        .bundle(callback)
    )();

    const bundlePath = path.join(tempPath, "bundle.js");
    writeFileSync(bundlePath, bundle);

    return await use(bundlePath);
  });
