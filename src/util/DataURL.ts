import assert from "assert";

export default class DataURL {
  constructor(
    readonly content: Buffer,
    readonly mimeType: string | undefined
  ) {}

  static parse(dataUrl: string): DataURL {
    assert(dataUrl.startsWith("data:"));
    const payload = dataUrl.substring(5);

    const commaIndex = payload.indexOf(",");
    assert(commaIndex !== -1);

    const meta = payload.substring(0, commaIndex);
    const isBase64 = meta.endsWith(";base64");
    const mimeType = isBase64 ? meta.substring(0, meta.length - 7) : meta;

    const data = payload.substring(commaIndex + 1);
    const content = isBase64
      ? Buffer.from(data, "base64")
      : Buffer.from(decodeURIComponent(data));

    return new DataURL(content, mimeType);
  }
}
