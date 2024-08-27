import { Worker, isMainThread, parentPort } from "worker_threads";

import { Agent } from "port_agent";
import assert from "assert";

export const isChildThread = !isMainThread;

export interface ThreadCallbackEntry {
  name: string;
  fn: (...args: any[]) => Promise<any>;
}

export const registerThreadCallback = (
  entriesFactory: () => ThreadCallbackEntry[]
): void => {
  assert(parentPort !== null);
  const agent = new Agent(parentPort);
  for (const entry of entriesFactory()) {
    agent.register(entry.name, entry.fn);
  }
};

export const callThreadCallback = async <T>(
  modulePath: string,
  name: string,
  ...args: unknown[]
): Promise<T> => {
  const worker = new Worker(modulePath);
  try {
    const agent = new Agent(worker);
    return await agent.call(name, ...args);
  } finally {
    worker.terminate();
  }
};
