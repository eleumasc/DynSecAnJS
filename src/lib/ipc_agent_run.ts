import { Agent, AgentController, UseOptions, Viewport } from "./Agent";
import { IPCServer, IPCServerHandler } from "../core/IPC";
import {
  StartOptions,
  isPuppeteerStartOptions,
  isSeleniumStartOptions,
} from "./IPCAgent";
import {
  setupManualTerminationHandling,
  waitForTerminationSignal,
} from "../core/process";

import Deferred from "../core/Deferred";
import { PuppeteerAgent } from "./PuppeteerAgent";
import { SeleniumAgent } from "./SeleniumAgent";

const createAgent = (startOptions: StartOptions): Agent => {
  if (isPuppeteerStartOptions(startOptions)) {
    const { options } = startOptions;
    return new PuppeteerAgent(options);
  } else if (isSeleniumStartOptions(startOptions)) {
    const { options } = startOptions;
    return new SeleniumAgent(options);
  } else {
    throw new Error(`Unknown agentType: ${startOptions.agentType}`);
  }
};

const main = async () => {
  setupManualTerminationHandling();

  let controller: AgentController | null = null;
  const getController = () => {
    if (controller) {
      return controller;
    } else {
      throw new Error("Agent has not been created yet");
    }
  };

  const handlers: Record<string, IPCServerHandler> = {
    "Agent.start": async (
      startOptions: StartOptions,
      useOptions: UseOptions
    ) => {
      const deferredStart = new Deferred<void>();

      const agent = createAgent(startOptions);
      agent
        .use(useOptions, async (ctrl) => {
          deferredStart.resolve();
          controller = ctrl;
          await waitForTerminationSignal();
          controller = null;
        })
        .catch((e) => {
          deferredStart.reject(e);
        });

      await deferredStart.promise;
    },
    "AgentController.navigate": (url: string, timeoutMs: number) => {
      return getController().navigate(url, timeoutMs);
    },
    "AgentController.screenshot": async () => {
      return (await getController().screenshot()).toString();
    },
    "AgentController.setViewport": async (viewport: Viewport) => {
      return getController().setViewport(viewport);
    },
  };

  const server = new IPCServer(handlers);
  server.start();
  await waitForTerminationSignal();
  server.close();
};

main();
