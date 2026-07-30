import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const README = new URL("../README.md", import.meta.url);

test("README gives an honest, executable simulator handoff", async () => {
  const readme = await readFile(README, "utf8");

  assert.match(readme, /authored and statically validated/i);
  assert.match(readme, /not.*executed.*simulator/i);
  assert.match(readme, /Maestro 2\.6\.1/);
  assert.match(readme, /no `ExcerLock-E2E` simulator/i);
  assert.match(
    readme,
    /eas build --profile e2e --platform ios --local/,
  );
  assert.match(readme, /developmentClient/);
  assert.match(readme, /APP_BINARY=.*run-suite\.sh/);
  assert.match(readme, /run-suite\.sh --flow flows\/locked-apps-states\.yaml/);
  assert.match(readme, /node --test e2e\/tests\/\*\.test\.mjs/);
  assert.match(readme, /maestro check-syntax/);
  assert.match(readme, /Unknown scenario names still fail/i);
  assert.doesNotMatch(readme, /the app does not exist/i);
  assert.doesNotMatch(readme, /Status: skeleton/i);
});

test("README never claims an unexecuted flow passed", async () => {
  const readme = await readFile(README, "utf8");

  // The assertions above keep the honest disclaimers present, but nothing there
  // stops a contradictory claim being added *alongside* them — a README can say
  // "execution is unverified" in one paragraph and "all flows are green" in the
  // next, and every match above still succeeds. These guard the other direction.
  //
  // Scanned per sentence, not over the whole document, for two reasons. A `.*`
  // between two words silently bridges unrelated sentences, and this file is
  // *about* the claims it forbids: it legitimately writes "No flow in this
  // directory is described as green" and "does not prove ... the suite passes
  // on-device". A sentence carrying a negator is denying the claim, not making
  // it, so it is skipped. That is a real hole — "nothing is wrong, all flows are
  // green" would slip through — but the guard is a lint against the careless
  // edit, not a proof, and the alternative was a guard that fails on honest prose.
  //
  // One assertion per phrase on purpose: a single combined regex alternation
  // reports only the first hit, and the failure message should name the phrase
  // that broke the contract. (Same lesson as the #66 notify-only guard, where a
  // single negated `arrayContaining` only failed when every name was present.)
  const FORBIDDEN_CLAIMS = [
    /\ball flows\b.*\bgreen\b/i,
    /\bflows?\b.*\b(are|is) (green|passing)\b/i,
    /\bsuite (passes|passed|is green)\b/i,
    /\bverified on (a |the )?simulator\b/i,
  ];
  const NEGATOR =
    /\b(no|not|never|nothing|none|unverified|until|cannot|can't|isn't|aren't|doesn't|don't|without)\b/i;

  // Markdown soft-wraps prose, so one sentence routinely spans several lines —
  // splitting on `\n` severs "does not prove ... " from "the suite passes
  // on-device" and the tail reads as a claim. Split into blocks (blank lines,
  // headings, list items, table rows), rejoin each block's soft wraps, and only
  // then split on sentence terminators.
  const claiming = readme
    .split(/\n\s*\n|\n(?=\s*(?:[-*+]|\d+\.|#{1,6}\s|\|)\s?)/)
    .flatMap((block) => block.replace(/\s*\n\s*/g, " ").split(/(?<=[.!?])\s+/))
    .filter((sentence) => !NEGATOR.test(sentence));

  for (const claim of FORBIDDEN_CLAIMS) {
    for (const sentence of claiming) {
      assert.doesNotMatch(
        sentence,
        claim,
        `README must not claim a flow passed until one actually runs: ${claim}`,
      );
    }
  }
});
