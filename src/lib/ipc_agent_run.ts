import { Agent, AgentController, UseOptions, Viewport } from "./Agent";
import { IPCServer, IPCServerHandler } from "../core/IPC";
import {
  StartOptions,
  isPuppeteerStartOptions,
  isSeleniumStartOptions,
} from "./IPCAgent";

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

const boot = async (cb: (controller: AgentController) => Promise<void>) => {
  const deferredStart = new Deferred<void>();

  const bootHandlers: Record<string, IPCServerHandler> = {
    "Agent.start": async (
      startOptions: StartOptions,
      useOptions: UseOptions
    ) => {
      bootServer.close();

      const agent = createAgent(startOptions);
      agent.use(useOptions, async (controller) => {
        deferredStart.resolve();
        await cb(controller);
      });

      await deferredStart.promise;
    },
  };

  const bootServer = new IPCServer(bootHandlers);
  bootServer.start();

  await deferredStart.promise;
};

const loop = async (controller: AgentController) => {
  const deferredClose = new Deferred<void>();

  const loopHandlers: Record<string, IPCServerHandler> = {
    "AgentController.navigate": (url: string) => {
      return controller.navigate(url);
    },
    "AgentController.screenshot": async () => {
      return (await controller.screenshot()).toString();
    },
    "AgentController.setViewport": async (viewport: Viewport) => {
      return controller.setViewport(viewport);
    },
    "Agent.close": async () => {
      loopServer.close();
      deferredClose.resolve();
    },
  };

  const loopServer = new IPCServer(loopHandlers);
  loopServer.start();

  await deferredClose.promise;
};

const main = () => {
  boot(loop);
};

main();
