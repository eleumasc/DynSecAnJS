import workerpool from "workerpool";
import { Completion, toCompletion } from "./Completion";

export const threadExec = async (
  method: (...args: any[]) => Promise<any>,
  args: any[],
): Promise<Completion<any>> => {
  const pool = workerpool.pool(`${__dirname}/../workers/__thread.js`);

  try {
    return await toCompletion(() => pool.exec(method.name, args));
  } finally {
    await pool.terminate();
  }
};
