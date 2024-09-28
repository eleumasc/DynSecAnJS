export const retryOnce = async <T>(callback: () => Promise<T>): Promise<T> => {
  try {
    return await callback();
  } catch {
    return await callback();
  }
};
