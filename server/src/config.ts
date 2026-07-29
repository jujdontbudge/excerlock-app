import { parseEnv } from "./env.js";

export const config = Object.freeze({
  ...parseEnv(),
  version: "0.1.0",
});
