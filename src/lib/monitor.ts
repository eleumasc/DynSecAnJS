import browserify from "browserify";

export type MonitorWaitUntil = "load" | "domcontentloaded";

export interface MonitorConfig {
  reporter: Reporter;
  loadingTimeoutMs: number;
  timeSeedMs: number;
  waitUntil: MonitorWaitUntil;
}

export interface MonitorReport {
  pageUrl: string;
  uncaughtErrors: string[];
  consoleMessages: string[];
  calledBuiltinMethods: string[];
  cookieKeys: string[];
  localStorageKeys: string[];
  sessionStorageKeys: string[];
  loadingCompleted: boolean;
}

export interface Reporter {
  type: string;
}

export interface LogReporter extends Reporter {
  type: "LogReporter";
}

export interface ExposedFunctionReporter extends Reporter {
  type: "ExposedFunctionReporter";
  functionName: string;
}

export interface SendReporter extends Reporter {
  type: "SendReporter";
  url: string;
}

export const bundleMonitor = (config: MonitorConfig): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    browserify({ basedir: "monitor" })
      .add("./index.js")
      .transform(
        require("@browserify/envify/custom")({
          CONFIG: JSON.stringify(config),
        })
      )
      .bundle((err, buf) => {
        if (err) {
          reject(err);
        } else {
          resolve(buf.toString());
        }
      });
  });
};
