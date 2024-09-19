import { delay } from "../util/timeout";
import { getToolQuasiFlows, uniqFlow } from "../measurement/flow/Flow";
import { useBrowserOrToolPage } from "../collection/BrowserOrToolPage";

async function main() {
  const [site] = process.argv.slice(2);

  const rawFlows = await useBrowserOrToolPage(
    "ProjectFoxhound",
    {},
    async (page) => {
      await page.goto(`http://${site}/`, { timeout: 30_000 });
      await delay(5_000);
      return await page.evaluate(`window["\$__taintReports"]`);
    }
  );

  const flows = uniqFlow(getToolQuasiFlows("ProjectFoxhound", rawFlows));
  console.log(flows);
}

main();
