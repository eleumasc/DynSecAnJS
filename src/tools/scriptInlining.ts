export const scriptInlining = () => {
  throw new Error("Not implemented");

  // return async (content, { contentType, req }) => {
  //   switch (contentType) {
  //     case "html":
  //       return await transformHtml(content, inlineExternalScripts(req.url));
  //     case "javascript":
  //       return content;
  //   }
  // };
};
