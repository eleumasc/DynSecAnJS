import { Agent, AgentFactory, PageController, UsePageOptions } from "./Agent";

import { timeBomb } from "../core/async";

export default class FaultAwareAgent implements Agent {
  protected agent: Agent | null = null;

  constructor(
    readonly timeoutMs: number,
    readonly agentFactory: AgentFactory
  ) {}

  async usePage<T>(
    options: UsePageOptions,
    cb: (page: PageController) => Promise<T>
  ): Promise<T> {
    if (this.agent === null) {
      this.agent = await this.agentFactory.call(null);
    }
    const { agent } = this;
    try {
      return await timeBomb(agent.usePage(options, cb), this.timeoutMs);
    } catch (e) {
      await this.terminate();
      throw e;
    }
  }

  async terminate(): Promise<void> {
    const { agent } = this;
    this.agent = null;
    await agent?.terminate();
  }
}
