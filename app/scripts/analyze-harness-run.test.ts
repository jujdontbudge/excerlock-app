import { execFileSync } from "node:child_process";
import path from "node:path";

const SCRIPT = path.join(__dirname, "analyze-harness-run.js");
const FIXTURE = path.join(
  __dirname,
  "fixtures",
  "harness-run-known-lag.jsonl",
);
const EMPTY_FIXTURE = path.join(
  __dirname,
  "fixtures",
  "harness-run-empty.jsonl",
);
const STRANDED_FIXTURE = path.join(
  __dirname,
  "fixtures",
  "harness-run-stranded.jsonl",
);

function analyze(file = FIXTURE): string {
  return execFileSync(process.execPath, [SCRIPT, file], {
    encoding: "utf8",
  });
}

describe("analyze-harness-run", () => {
  it("prints each declared transition against every observed layer with known lags", () => {
    expect(analyze()).toBe(
      [
        "Run m6-1000 (m6-standing-scroll)",
        "Build: abc123",
        "Ended: stopped early after 4.000s",
        "",
        'Declared @ +0.500s: "I am walking"',
        '  motion / raw.cadence: +0.400s => {"stepsPerSecond":1.3}',
        '  motion / derived.verdict: +0.800s => {"walking":true}',
        '  placement / derived.classification: +1.000s => {"placement":"handheld"}',
        "",
        'Declared @ +3.000s: "I have stopped"',
        '  motion / raw.cadence: +0.200s => {"stepsPerSecond":0}',
        "  motion / derived.verdict: never responded before the run ended",
        '  placement / derived.classification: +0.700s => {"placement":"propped"}',
        "",
      ].join("\n"),
    );
  });

  it("does not pass a reconstructed end off as a clean timeout", () => {
    expect(analyze(STRANDED_FIXTURE)).toContain(
      "Ended: stranded after 66.500s (end reconstructed, not observed)",
    );
  });

  it("prints an empty, unfinished run plainly instead of crashing", () => {
    expect(analyze(EMPTY_FIXTURE)).toBe(
      [
        "Run empty-8000 (empty-run)",
        "Build: def456",
        "Ended: run is incomplete (no end time)",
        "",
        "No declared transitions recorded.",
        "No signal layers recorded.",
        "",
      ].join("\n"),
    );
  });
});
