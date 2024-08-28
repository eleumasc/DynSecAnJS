export const streamToString = (stream: NodeJS.ReadableStream) =>
  new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];

    stream.on("data", function (chunk) {
      chunks.push(Buffer.from(chunk));
    });

    stream.on("end", function () {
      resolve(Buffer.concat(chunks).toString());
    });
  });
