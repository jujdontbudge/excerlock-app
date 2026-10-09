import { createHash } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { spawnSync } from "node:child_process";
import { GAIT_SETTINGS } from "../../app-next/src/packages/unlock/lib/gait/WindowedGaitDetector";
import type { GaitKeypointSample } from "../../app-next/src/packages/ports/GaitVisionProvider";
import { replay, type ReplayOutcome } from "./replay";
const root = resolve(import.meta.dirname, "../..");
const folder = resolve(process.argv[2]);
const labelsIndex = process.argv.indexOf("--labels");
const labels: Record<string, { verified: boolean; transitionMs?: number }> | undefined = labelsIndex < 0
  ? undefined : JSON.parse(readFileSync(resolve(process.argv[labelsIndex + 1]), "utf8"));
const payloadIndex = process.argv.indexOf("--payload");
const payload = payloadIndex < 0 ? "build17" : process.argv[payloadIndex + 1];
if (!["build17", "build18"].includes(payload))
  throw new Error("--payload must be build17 or build18");
const detectorSources = [
  "app-next/src/packages/unlock/lib/gait/WindowedGaitDetector.ts",
  "app-next/src/packages/unlock/lib/gait/GaitCorroboration.ts",
  "app-next/src/packages/unlock/lib/gait/TreadmillScanController.ts",
];
const algorithmHash = createHash("sha256")
  .update(
    detectorSources
      .map((path) => readFileSync(join(root, path), "utf8"))
      .join("\n"),
  )
  .digest("hex");
const heldIndex = process.argv.indexOf("--held-out");
const sessionNames: Record<string, string> = {
  "session-one": "s1",
  "session-two": "s2",
  "session-three": "s3",
};
const requested = heldIndex >= 0 ? process.argv[heldIndex + 1] : null;
const heldOut = requested ? (sessionNames[requested] ?? requested) : null;
if (heldOut && !["s1", "s2", "s3"].includes(heldOut))
  throw new Error("--held-out must be s1, s2 or s3");
const freeze = JSON.parse(
  readFileSync(join(import.meta.dirname, "frozen-settings.json"), "utf8"),
);
if (JSON.stringify(freeze) !== JSON.stringify(GAIT_SETTINGS))
  throw new Error(
    "Detector settings differ from the frozen settings. Freeze calibration before opening held-out clips.",
  );
const settingsHash = createHash("sha256")
  .update(JSON.stringify(GAIT_SETTINGS))
  .digest("hex");
const at = new Date().toISOString();
const dir = join(root, ".excer", "gait-eval", "v1", at.replace(/[:.]/g, "-"));
mkdirSync(dir, { recursive: true });
let extractor18: string | undefined;
const extractorSources = [
  "GaitVisionPayloads.swift",
  "GaitCameraMotion.swift",
  "GaitFrameAnalyzer.swift",
].map((name) =>
  join(root, "tools", "gait-fixture-extractor", "build18", name),
);
extractorSources.push(
  join(root, "tools", "gait-fixture-extractor", "build18", "main.swift"),
);
const extractorHash = createHash("sha256")
  .update(
    (payload === "build18"
      ? extractorSources
      : [join(root, "tools", "gait-fixture-extractor", "extract.swift")]
    )
      .map((path) => readFileSync(path, "utf8"))
      .join("\n"),
  )
  .digest("hex");
if (payload === "build18") {
  const binDir = join(root, ".excer", "gait-eval", "bin");
  mkdirSync(binDir, { recursive: true });
  extractor18 = join(binDir, `extract-build18-${extractorHash}`);
  const compiled = spawnSync(
    "swiftc",
    ["-O", ...extractorSources, "-o", extractor18],
    { encoding: "utf8" },
  );
  if (compiled.status !== 0)
    throw new Error(
      `Build 18 extractor compilation failed: ${compiled.stderr}`,
    );
}
function timingSummary(samples: GaitKeypointSample[]) {
  const summarize = (values: number[]) => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    return sorted.length
      ? {
          count: sorted.length,
          meanMs: sorted.reduce((a, b) => a + b, 0) / sorted.length,
          p95Ms: sorted[Math.floor((sorted.length - 1) * 0.95)],
          maxMs: sorted[sorted.length - 1],
        }
      : null;
  };
  const stages = ["poseMs", "faceMs", "motionMs", "totalMs"] as const;
  return {
    stages: Object.fromEntries(
      stages.map((key) => [
        key,
        summarize(
          samples.flatMap((sample) =>
            sample.timing ? [sample.timing[key]] : [],
          ),
        ),
      ]),
    ),
    deliveryDelay: summarize(
      samples.flatMap((sample) =>
        sample.analysisTimestampMs === undefined
          ? []
          : [sample.analysisTimestampMs - sample.timestampMs],
      ),
    ),
    explicitEmptyFrames: samples.filter((sample) => sample.empty).length,
    samples: samples.length,
    limitation: "Extracted macOS timings are not iPhone 13 live measurements.",
  };
}
const files = readdirSync(folder)
  .filter((name) => /\.(mov|mp4|json)$/i.test(name))
  .sort();
type ClipOutcome = Pick<ReplayOutcome, "passed" | "timeToPassMs" | "reason">;
type Clip = {
  name: string;
  session: string | null;
  label: string;
  sourceHash: string;
  trajectory?: string;
  extraction?: unknown;
  timings?: ReturnType<typeof timingSummary>;
  error?: string;
  observedMs?: number;
  labelVerified?: boolean;
  transitionViolation?: string;
  new: ClipOutcome;
  old: ClipOutcome | null;
};
const clips: Clip[] = [];
for (const name of files) {
  const session =
    name.match(/-(s[123])-/)?.[1] ??
    Object.entries(sessionNames).find(([namePart]) =>
      name.includes(`-${namePart}-`),
    )?.[1] ??
    null;
  if (!heldOut && session === "s3") {
    console.log(`${name}: reserved, unopened`);
    continue;
  }
  const path = join(folder, name);
  const sourceHash = createHash("sha256")
    .update(readFileSync(path))
    .digest("hex");
  let trajectory = path;
  if (extname(name).toLowerCase() !== ".json") {
    trajectory = join(dir, `${name}.json`);
    const extraction = spawnSync(
      extractor18 ?? "swift",
      extractor18
        ? [path, trajectory]
        : [
            join(root, "tools", "gait-fixture-extractor", "extract.swift"),
            path,
            trajectory,
          ],
      { encoding: "utf8" },
    );
    if (extraction.status !== 0) {
      clips.push({
        name,
        session,
        label: name.split("-")[0],
        sourceHash,
        error: extraction.stderr.trim(),
        new: { passed: false, timeToPassMs: null, reason: "extractionFailed" },
        old: null,
      });
      console.log(`${name}: extraction failed`);
      continue;
    }
  }
  const raw = JSON.parse(readFileSync(trajectory, "utf8"));
  const input = Array.isArray(raw) ? raw : raw.samples;
  if (!Array.isArray(input))
    throw new Error(`${name}: expected an array or { samples: [...] }`);
  const first =
    input.find((s: GaitKeypointSample) => Number.isFinite(s.timestampMs))
      ?.timestampMs ?? 0;
  const origin = raw.startedAtMs ?? (first > 10_000_000_000 ? first : 0);
  const samples = input.map((s: GaitKeypointSample) => ({
    ...s,
    landmarks: s.landmarks ?? {},
    timestampMs: s.timestampMs - origin,
    analysisTimestampMs:
      s.analysisTimestampMs === undefined
        ? undefined
        : s.analysisTimestampMs - origin,
    captureTimestampMs:
      s.captureTimestampMs === undefined
        ? undefined
        : s.captureTimestampMs - origin,
  }));
  const current = await replay(samples),
    old = await replay(samples, true);
  const label = name.split("-")[0];
  clips.push({
    name,
    session,
    label,
    sourceHash,
    trajectory,
    observedMs: samples.at(-1)?.timestampMs ?? 0,
    labelVerified: labels?.[name.replace(/\.json$/i, "")]?.verified,
    transitionViolation: label === "startstop" && current.timeToPassMs !== null
      ? name.includes("-start-walking") && current.timeToPassMs < (labels?.[name.replace(/\.json$/i, "")]?.transitionMs ?? 10_000)
        ? "passedBeforeWalkingStarted"
        : name.includes("-stop-walking") && current.timeToPassMs >= (labels?.[name.replace(/\.json$/i, "")]?.transitionMs ?? 10_000)
          ? "passedAfterWalkingStopped" : undefined
      : undefined,
    extraction: raw.extraction ?? null,
    timings: timingSummary(samples),
    new: current,
    old,
  });
  console.log(
    `${name}: new ${current.passed ? `PASS ${(current.timeToPassMs! / 1000).toFixed(2)} s` : `REJECT ${current.reason}`} | old ${old.passed ? `PASS ${(old.timeToPassMs! / 1000).toFixed(2)} s` : `REJECT ${old.reason}`}`,
  );
}
const walks = clips.filter((c) => c.label === "walk");
const timely = walks.filter(
  (c) => c.new.passed && c.new.timeToPassMs! <= 10_000,
);
const incidental = clips.filter(
  (c) =>
    ["still", "talk", "look", "shift", "adjust", "rails", "behind"].includes(
      c.label,
    ) && c.session === heldOut,
);
const residual = clips.filter((c) => c.label === "bob");
const transitions = clips.filter((c) => c.label === "startstop");
const categories = [
  "still",
  "talk",
  "look",
  "shift",
  "adjust",
  "rails",
  "behind",
];
const negatives = clips.filter((c) => [...categories, "bob"].includes(c.label));
const clipIds = clips.map((c) =>
  c.name
    .replace(/\.(mov|mp4|json)$/i, "")
    .replace(/\.(mov|mp4)$/i, "")
    .toLowerCase(),
);
const complete =
  heldOut !== null &&
  walks.length === 18 &&
  negatives.length === 36 &&
  incidental.length === 11 &&
  categories.every((label) => incidental.some((c) => c.label === label)) &&
  clips.length === 60 &&
  transitions.length === 6 &&
  new Set(clipIds).size === clips.length &&
  ["s1", "s2", "s3"].every(
    (session) =>
      clips.filter((c) => c.session === session).length === 20 &&
      walks.filter((c) => c.session === session).length === 6 &&
      negatives.filter((c) => c.session === session).length === 12 &&
      transitions.filter((c) => c.session === session).length === 2,
  ) &&
  !clips.some((c) => "error" in c || (c.observedMs ?? 0) < 25_000 || c.labelVerified === false);
const falsePasses = incidental.filter((c) => c.new.passed);
const verdict =
  clips.some((c) => c.transitionViolation) || residual.some((c) => c.new.passed) || falsePasses.length || (walks.length === 18 && timely.length < 17)
    ? "NO-GO"
    : complete
      ? "GO"
      : "PENDING";
const report = {
  schemaVersion: 1,
  at,
  algorithm: GAIT_SETTINGS.version,
  algorithmHash,
  payload,
  extractorHash,
  settings: GAIT_SETTINGS,
  settingsHash,
  commit: spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).stdout.trim(),
  heldOut,
  verdict,
  goNoGo: {
    timelyWalks: timely.length,
    required: "17 of 18 within 10 s",
    incidentalHeldOutFalsePasses: falsePasses.map((c) => c.name),
    incidentalHeldOutCount: incidental.length,
    complete,
  },
  deliberateBobbing: residual.map((c) => ({ name: c.name, ...c.new })),
  transitions: transitions.map((c) => ({ name: c.name, ...c.new })),
  clips,
  limits: [
    "Owner/setup evaluation only; filename labels are not visual ground truth.",
    "Clips shorter than 25 seconds and explicitly unverified labels block GO. A no-pass on a short clip is censored evidence, not a safe rejection.",
    "Transition violations follow supplied labels; verify contradictory labels before tuning. A one-shot scan cannot prove continuous walking or relock after a later stop.",
    "Camera-app video replay does not prove live iPhone timing, lag or suspended Screen Time enforcement.",
    "Deliberate rhythmic imitation is a known residual.",
  ],
};
writeFileSync(join(dir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
const text = [
  `# Treadmill evaluation — ${verdict}`,
  `${timely.length}/${walks.length} walks pass within 10 s; requirement: at least 17/18.`,
  `Held-out incidental negatives: ${falsePasses.length} passes / ${incidental.length}; requirement: zero.`,
  `Deliberate bobbing: ${residual.filter((c) => c.new.passed).length}/${residual.length} passes, reported separately.`,
  `Settings: ${settingsHash}`,
  `Payload: ${payload}; algorithm: ${algorithmHash}; extractor: ${extractorHash}`,
  "",
  "| Clip | New | Old | Reason | Observed s | Label verified | Transition violation |",
  "|---|---|---|---|---|---|---|",
  ...clips.map(
    (c) =>
      `| ${c.name} | ${c.new.passed ? `${c.new.timeToPassMs! / 1000} s` : "reject"} | ${c.old?.passed ? `${c.old.timeToPassMs! / 1000} s` : "reject"} | ${c.new.reason} | ${((c.observedMs ?? 0) / 1000).toFixed(2)} | ${c.labelVerified ?? "filename only"} | ${c.transitionViolation ?? ""} |`,
  ),
  "",
  ...report.limits,
];
writeFileSync(join(dir, "report.md"), `${text.join("\n")}\n`);
console.log(
  `\n${verdict}: ${timely.length}/18 walks within 10 s; ${falsePasses.length} held-out incidental passes.\nReport: ${join(dir, "report.md")}`,
);
