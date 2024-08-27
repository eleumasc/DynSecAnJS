// @ts-ignore
import EnvifyCustomPlugin from "@browserify/envify/custom";
import browserify from "browserify";
import path from "path";
import { promisify } from "util";
import { useTempDirectory } from "../util/TempDirectory";
import { writeFileSync } from "fs";

const monitorDir = path.resolve("monitor");

export interface MonitorEnv {
  ifaToolName?: string;
}

export type MonitorState =
  | {
      loadingCompleted: false;
    }
  | {
      loadingCompleted: true;
      uncaughtErrors: string[];
      flows?: any;
    };

export const useMonitorBundle = <T>(
  env: MonitorEnv,
  use: (bundlePath: string) => Promise<T>
): Promise<T> =>
  useTempDirectory(async (tempPath) => {
    const bundle = await promisify<Buffer>((callback) =>
      browserify({ basedir: monitorDir })
        .add("./index.js")
        .transform(EnvifyCustomPlugin(env))
        .bundle(callback)
    )();

    const bundlePath = path.join(tempPath, "bundle.js");
    writeFileSync(bundlePath, bundle);

    return await use(bundlePath);
  });
