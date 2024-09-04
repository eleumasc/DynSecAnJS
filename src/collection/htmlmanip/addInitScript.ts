import { HTMLManipulator } from "./HTMLManipulator";

export const addInitScript =
  (source: string): HTMLManipulator =>
  async (htmlDocument) => {
    const initHtmlScript = htmlDocument.createInitScript();
    initHtmlScript.inlineSource = source;
  };
