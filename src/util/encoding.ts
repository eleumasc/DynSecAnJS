import {
  brotliCompressSync,
  brotliDecompressSync,
  deflateSync,
  gunzipSync,
  gzipSync,
  inflateSync,
} from "zlib";

type Encoding =
  | ""
  | "identity"
  | "none"
  | "utf-8"
  | "utf8"
  | "gzip"
  | "deflate"
  | "br";

export const encode = (input: Buffer, encoding: string): Buffer => {
  encoding = encoding.toLowerCase();
  switch (encoding as Encoding) {
    case "":
    case "identity":
    case "none":
    case "utf-8":
    case "utf8":
      return input;
    case "gzip":
      return compressGzip(input);
    case "deflate":
      return compressDeflate(input);
    case "br":
      return compressBrotli(input);
    default:
      throw new Error(`Cannot encode: ${encoding}`);
  }
};

export const decode = (input: Buffer, encoding: string): Buffer => {
  encoding = encoding.toLowerCase();
  switch (encoding as Encoding) {
    case "":
    case "identity":
    case "none":
    case "utf-8":
    case "utf8":
      return input;
    case "gzip":
      return decompressGzip(input);
    case "deflate":
      return decompressDeflate(input);
    case "br":
      return decompressBrotli(input);
    default:
      throw new Error(`Cannot decode: ${encoding}`);
  }
};

export const compressGzip = (input: Buffer): Buffer => {
  return gzipSync(input);
};

export const decompressGzip = (input: Buffer): Buffer => {
  return gunzipSync(input);
};

export const compressDeflate = (input: Buffer): Buffer => {
  return deflateSync(input);
};

export const decompressDeflate = (input: Buffer): Buffer => {
  return inflateSync(input);
};

export const compressBrotli = (input: Buffer): Buffer => {
  return brotliCompressSync(input);
};

export const decompressBrotli = (input: Buffer): Buffer => {
  return brotliDecompressSync(input);
};
