export const ignoreJSON = async (
  code: string,
  cb: (code: string) => Promise<string>
): Promise<string> => {
  try {
    return await cb(code);
  } catch (e) {
    try {
      JSON.parse(code);
      return code;
    } catch {
      throw e;
    }
  }
};
