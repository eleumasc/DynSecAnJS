import { Worker, isMainThread, parentPort } from "worker_threads";

import { Agent } from "port_agent";
import assert from "assert";

export const callAgent = async <T>(
  workerScriptUrl: string,
  name: string,
  ...args: unknown[]
): Promise<T> => {
  const worker = new Worker(workerScriptUrl);
  try {
    const agent = new Agent(worker);
    return await agent.call(name, ...args);
  } finally {
    worker.terminate();
  }
};

export interface AgentEntry {
  name: string;
  fn: (...args: any[]) => Promise<any>;
}

export const registerAgent = (entriesFactory: () => AgentEntry[]): void => {
  if (isMainThread) {
  } else {
    assert(parentPort !== null);
    const agent = new Agent(parentPort);
    for (const entry of entriesFactory()) {
      agent.register(entry.name, entry.fn);
    }
  }
};
