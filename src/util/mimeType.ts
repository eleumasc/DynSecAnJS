export const isJavaScriptMimeType = (mimeType: string): boolean =>
  mimeType.includes("javascript");

export const isESModuleMimeType = (mimeType: string): boolean =>
  mimeType === "module";
