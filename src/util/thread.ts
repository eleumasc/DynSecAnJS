import assert from "assert";
import { Agent } from "port_agent";
import { Completion, toCompletion } from "./Completion";
import { isMainThread, parentPort, Worker } from "worker_threads";

export const threadExec = async (
  filename: string,
  args: any[]
): Promise<Completion<any>> => {
  const worker = new Worker(filename);
  const agent = new Agent(worker);

  try {
    return await toCompletion(() => agent.call("callback", ...args));
  } finally {
    await worker.terminate();
  }
};

export const threadRegister = (
  callback: (...args: any[]) => Promise<any>
): void => {
  if (isMainThread) return;

  assert(parentPort);
  const agent = new Agent(parentPort);

  agent.register("callback", callback);
};
