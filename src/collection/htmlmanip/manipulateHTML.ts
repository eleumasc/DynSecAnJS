import HTMLDocument from "../../htmlutil/HTMLDocument";
import { HTMLManipulator } from "./HTMLManipulator";

export const manipulateHTML = async (
  source: string,
  manipulator: HTMLManipulator
): Promise<string> => {
  const htmlDocument = HTMLDocument.parse(source);
  await manipulator(htmlDocument);
  return htmlDocument.serialize();
};
