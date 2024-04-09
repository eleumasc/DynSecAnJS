import { Agent, AgentController, UseOptions, Viewport } from "./Agent";
import {
  PuppeteerAgent,
  Options as PuppeteerAgentOptions,
} from "./PuppeteerAgent";

import { IPCClient } from "../core/IPC";
import {
  SeleniumAgent,
  Options as SeleniumAgentOptions,
} from "./SeleniumAgent";
import { Serializable, fork } from "child_process";
import path from "path";
import { useChildProcess } from "../core/process";
import { timeBomb } from "../core/async";

export interface StartOptions {
  agentType: string;
  options: any;
}

export interface PuppeteerStartOptions extends StartOptions {
  agentType: "PuppeteerAgent";
  options: PuppeteerAgentOptions;
}

export const isPuppeteerStartOptions = (
  startOptions: StartOptions
): startOptions is PuppeteerStartOptions =>
  startOptions.agentType === "PuppeteerAgent";

export interface SeleniumStartOptions extends StartOptions {
  agentType: "SeleniumAgent";
  options: SeleniumAgentOptions;
}

export const isSeleniumStartOptions = (
  startOptions: StartOptions
): startOptions is SeleniumStartOptions =>
  startOptions.agentType === "SeleniumAgent";

export class IPCAgent implements Agent {
  constructor(readonly startOptions: StartOptions) {}

  use<T>(
    useOptions: UseOptions,
    cb: (controller: AgentController) => Promise<T>
  ): Promise<T> {
    return useChildProcess(
      {
        childProcess: fork(path.join(__dirname, "ipc_agent_run.js")),

        terminate: async (childProcess) => {
          childProcess.kill("SIGINT");
        },
      },

      async (childProcess) => {
        const client = new IPCClient(childProcess);
        client.start();
        try {
          await call(client, "Agent.start", [this.startOptions, useOptions]);
          return await cb(new IPCAgentController(client));
        } finally {
          client.close();
        }
      }
    );
  }

  static from(agent: Agent): IPCAgent {
    if (agent instanceof PuppeteerAgent) {
      return new IPCAgent(<PuppeteerStartOptions>{
        agentType: "PuppeteerAgent",
        options: agent.options,
      });
    } else if (agent instanceof SeleniumAgent) {
      return new IPCAgent(<SeleniumStartOptions>{
        agentType: "SeleniumAgent",
        options: agent.options,
      });
    } else {
      throw new Error(`Unknown agent: ${agent.constructor.name}`);
    }
  }
}

export class IPCAgentController implements AgentController {
  constructor(readonly client: IPCClient) {}

  navigate(url: string, timeoutMs: number): Promise<void> {
    return call(this.client, "AgentController.navigate", [url, timeoutMs]);
  }

  async screenshot(): Promise<Buffer> {
    return Buffer.from(
      await call(this.client, "AgentController.screenshot", [])
    );
  }

  setViewport(viewport: Viewport): Promise<void> {
    return call(this.client, "AgentController.setViewport", [viewport]);
  }
}

const call = (
  client: IPCClient,
  command: string,
  args: Serializable[]
): Promise<any> => {
  return timeBomb(client.call(command, args), 15_000);
};
