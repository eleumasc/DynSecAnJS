export interface ExecutionDetail {
  pageUrl: string;
  uncaughtErrors: string[];
  consoleMessages: string[];
  calledBuiltinMethods: string[];
  cookieKeys: string[];
  localStorageKeys: string[];
  sessionStorageKeys: string[];
  targetSites: string[];
  includedScriptUrls: string[];
  loadingCompleted: boolean;
  executionTimeMs: number;
  transformErrors: string[];
  screenshotFile?: string;
}
