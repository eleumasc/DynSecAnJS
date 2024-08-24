export const isJavaScriptMimeType = (mimeType: string): boolean => {
  return mimeType.includes("javascript") || mimeType === "module";
};
