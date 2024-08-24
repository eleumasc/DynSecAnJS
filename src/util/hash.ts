import { BinaryLike, createHash } from "crypto";

export const md5 = (data: BinaryLike): string =>
  createHash("md5").update(data).digest("hex");
