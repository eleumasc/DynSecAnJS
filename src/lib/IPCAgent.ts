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
import { fork } from "child_process";
import path from "path";

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

  async use<T>(
    useOptions: UseOptions,
    cb: (controller: AgentController) => Promise<T>
  ): Promise<T> {
    const childProcess = fork(path.join(__dirname, "ipc_agent_run.js"));
    const client = new IPCClient(childProcess);
    client.start();
    try {
      await client.call("Agent.start", [this.startOptions, useOptions]);
      try {
        return await cb(new IPCAgentController(client));
      } finally {
        await client.call("Agent.close", []);
      }
    } finally {
      client.close();
      childProcess.kill();
    }
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

  navigate(url: string): Promise<void> {
    return this.client.call("AgentController.navigate", [url]);
  }

  async screenshot(): Promise<Buffer> {
    return Buffer.from(
      await this.client.call("AgentController.screenshot", [])
    );
  }

  setViewport(viewport: Viewport): Promise<void> {
    return this.client.call("AgentController.setViewport", [viewport]);
  }
}
