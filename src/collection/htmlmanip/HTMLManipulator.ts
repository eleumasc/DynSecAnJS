import HTMLDocument from "../../htmlutil/HTMLDocument";

export type HTMLManipulator = (htmlDocument: HTMLDocument) => Promise<void>;

export const composeHTMLManipulators =
  (head: HTMLManipulator, ...tail: HTMLManipulator[]): HTMLManipulator =>
  async (...args) => {
    await head(...args);
    for (const tailItem of tail) {
      await tailItem(...args);
    }
  };
