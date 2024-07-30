import WPRArchive from "./wpr/WPRArchive";
import fs from "fs";
import path from "path";

const checkArchive = (file: string): void => {
  const archive = WPRArchive.fromFile(file);

  for (const request of archive.requests) {
    const contentType = request.headers.get("content-type");
    if (
      contentType &&
      (contentType.includes("html") || contentType.includes("javascript"))
    ) {
      request.response.body;
    }
  }
};

async function main() {
  const directoryPath = path.resolve(process.argv[2]);

  const targetExtension: string = ".wprgo";

  for (const file of fs
    .readdirSync(directoryPath)
    .filter((file) => path.extname(file).toLowerCase() === targetExtension)) {
    console.log(file);
    const filePath = path.join(directoryPath, file);
    checkArchive(filePath);
  }
}

main();
