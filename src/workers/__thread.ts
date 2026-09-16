import workerpool from "workerpool";
import { preanalyzeSite } from "./preanalyzeSite";

workerpool.worker({
  preanalyzeSite,
});
