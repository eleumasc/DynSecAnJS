import { Agent, AgentFactory, RunOptions } from "./Agent";
import { ExecutionDetail } from "./ExecutionAnalysis";
import { defaultFaultAwarenessTimeoutMs } from "./defaults";
import { Failure, Fallible } from "./util/Fallible";
import { timeBomb } from "./util/async";

export default class FaultAwareAgent implements Agent {
  protected agent: Agent | null = null;

  constructor(readonly agentFactory: AgentFactory) {}

  async run(runOptions: RunOptions): Promise<Fallible<ExecutionDetail>> {
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
