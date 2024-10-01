import assert from "assert";
import { CollectArchive } from "../archive/CollectArchive";
import {
  getBrowserNameByToolName,
  isToolName,
  ToolName,
} from "../collection/ToolName";

export type ToolBrowserCollectArchivePair = {
  toolArchive: CollectArchive;
  browserArchive: CollectArchive;
};

export const pairToolBrowserCollectArchives = (
  collectArchives: CollectArchive[]
): ToolBrowserCollectArchivePair[] => {
  return collectArchives
    .filter((archive) => isToolName(archive.logfile.browserOrToolName))
    .map((toolArchive) => {
      const toolName = toolArchive.logfile.browserOrToolName as ToolName;
      const browserName = getBrowserNameByToolName(toolName);
      const browserArchive = collectArchives.find(
        (collectArchive) =>
          collectArchive.logfile.browserOrToolName === browserName
      );
      assert(
        browserArchive,
        `browserCollectArchive ${browserName} not found for toolCollectArchive ${toolName}`
      );
      return { toolArchive, browserArchive };
    });
};
