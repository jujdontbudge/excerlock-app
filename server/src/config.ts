import packageMetadata from "../package.json" with { type: "json" };
import { parseEnv } from "./env.js";

export const config = Object.freeze({
  ...parseEnv(),
  version: packageMetadata.version,
});
