import browserify from "browserify";

export interface MonitorReport {
  uncaughtErrors: string[];
  consoleMessages: string[];
  calledNativeMethods: string[];
  cookieKeys: string[];
  localStorageKeys: string[];
  sessionStorageKeys: string[];
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

export const bundleMonitor = (reporter: Reporter): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    browserify({ basedir: "monitor" })
      .add("./index.js")
      .transform(
        require("@browserify/envify/custom")({
          REPORTER: JSON.stringify(reporter),
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
