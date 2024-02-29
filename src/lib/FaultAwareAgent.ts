import { Agent, AgentFactory, RunOptions } from "./Agent";
import { defaultFaultAwarenessTimeoutMs } from "./defaults";
import { Failure, Fallible } from "./util/Fallible";
import { timeBomb } from "./util/async";

export default class FaultAwareAgent<T> implements Agent<T> {
  protected agent: Agent<T> | null = null;

  constructor(readonly agentFactory: AgentFactory<T>) {}

  async run(runOptions: RunOptions): Promise<Fallible<T>> {
    if (this.agent === null) {
      this.agent = await this.agentFactory.call(null);
    }
    const { agent } = this;
    try {
      return await timeBomb(
        agent.run(runOptions),
        defaultFaultAwarenessTimeoutMs
      );
    } catch (e) {
      await this.terminate();
      return <Failure>{
        status: "failure",
        reason: String(e),
      };
    }
  }

  async terminate(): Promise<void> {
    const { agent } = this;
    this.agent = null;
    await agent?.terminate();
  }
}
