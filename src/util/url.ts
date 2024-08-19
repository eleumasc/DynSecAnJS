const dropHash = (url: string) => {
  const hashIndex = url.indexOf("#");
  return hashIndex !== -1 ? url.substring(0, hashIndex) : url;
};
