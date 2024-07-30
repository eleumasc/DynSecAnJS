import WPRArchive from "./wpr/WPRArchive";
import fs from "fs";
import path from "path";

let counter = 0;

const checkArchive = (file: string): void => {
  const archive = WPRArchive.fromFile(file);

  const requests = archive.requests.filter((request) => {
    const contentType = request.headers.get("content-type");
    return (
      contentType &&
      (contentType.includes("html") || contentType.includes("javascript"))
    );
  });

  console.log((counter += requests.length));

  for (const request of requests) {
    request.response.body;
  }
};

const triage = (e: unknown, filePath: string) => {
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    return new Error("File is empty");
  }
  return e;
};

async function main() {
  const directoryPath = path.resolve(process.argv[2]);

  const targetExtension: string = ".wprgo";

  for (const file of fs
    .readdirSync(directoryPath)
    .filter((file) => path.extname(file).toLowerCase() === targetExtension)) {
    console.log(file);
    const filePath = path.join(directoryPath, file);

    try {
      checkArchive(filePath);
    } catch (e) {
      console.log(triage(e, filePath));
    }
  }
}

main();
