import { Page } from "playwright";
import { BodyTransformer } from "../../src/lib/BodyTransformer";
import { Request, Response } from "../../src/lib/AnalysisProxy";
import Deferred from "../../src/core/Deferred";

export const executeProgram = async (
  page: Page,
  code: (g: any) => any,
  bodyTransformer?: BodyTransformer
): Promise<any> => {
  const getResponse = (): Response => {
    const req = <Request>{
      method: "GET",
      url: new URL("https://transparency.test/"),
      headers: {},
    };

    return {
      req,
      statusCode: 200,
      statusMessage: "OK",
      headers: { "content-type": "text/html" },
      contentType: "html",
      body: `
  <!doctype html>
  <html>
    <head>
      <title>Test Page</title>
    </head>
    <body>
      <script>
      ${`(${code.toString()})(this)`}
      </script>
    </body>
  </html>
  `,
    };
  };

  const res = getResponse();
  const { body: resBody } = res;
  const transformedBody = bodyTransformer
    ? await bodyTransformer(resBody, res)
    : resBody;

  const deferredCollect = new Deferred<any>();

  await page.exposeFunction("collect", (value: any) => {
    deferredCollect.resolve(value);
  });
  await page.setContent(transformedBody);

  return await deferredCollect.promise;
};
