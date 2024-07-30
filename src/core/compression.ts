import {
  brotliCompressSync,
  brotliDecompressSync,
  deflateSync,
  gunzipSync,
  gzipSync,
  inflateSync,
} from "zlib";

export const compress = (input: Buffer, encoding: string): Buffer => {
  switch (encoding) {
    case "":
    case "identity":
      return input;
    case "gzip":
      return compressGzip(input);
    case "deflate":
      return compressDeflate(input);
    case "br":
      return compressBrotli(input);
    default:
      throw new Error(`Cannot compress`);
  }
};

export const decompress = (input: Buffer, encoding: string): Buffer => {
  switch (encoding) {
    case "":
    case "identity":
      return input;
    case "gzip":
      return decompressGzip(input);
    case "deflate":
      return decompressDeflate(input);
    case "br":
      return decompressBrotli(input);
    default:
      throw new Error(`Cannot decompress: ${encoding}`);
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
