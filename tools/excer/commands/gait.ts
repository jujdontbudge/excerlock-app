import { fromRoot } from "../lib/paths.ts";
import { run, UsageError } from "../lib/shell.ts";
export const gaitHelp = `excer gait eval <folder> [--held-out session-three] [--payload build17|build18] [--labels manifest.json]\n\nReplays local MOV/mp4 or extracted JSON through both scan controllers.\nReports and extracted trajectories stay under .excer/gait-eval/.\nFreeze settings on sessions 1 and 2 before evaluating session 3.`;
export async function gaitCommand(args: string[]): Promise<number> {
  if (args[0] !== "eval" || !args[1]) throw new UsageError(gaitHelp);
  return run(
    "node",
    [
      "--import",
      "tsx",
      fromRoot("tools", "gait-eval", "main.ts"),
      ...args.slice(1),
    ],
    { stdio: "inherit" },
  ).code;
}
