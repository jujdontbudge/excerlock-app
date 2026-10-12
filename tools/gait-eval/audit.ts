import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  GAIT_SETTINGS,
  WindowedGaitDetector,
} from "../../app-next/src/packages/unlock/lib/gait/WindowedGaitDetector";
import type { GaitKeypointSample } from "../../app-next/src/packages/ports/GaitVisionProvider";
import { replay } from "./replay";

type Mapping = { original: string; protocol: string; take: number };
type Decision = {
  pass: number | null;
  lastWalking: number | null;
  firstRelease: number | null;
  lastReason: string;
  windows: {
    at: number;
    reason: string;
    walking: boolean;
    rms?: number;
    r?: number;
    r2?: number;
  }[];
};
const root = resolve(import.meta.dirname, "../..");
const review = resolve(process.argv[2]);
const output = resolve(process.argv[3] ?? join(root, ".excer/gait-round-two"));
mkdirSync(output, { recursive: true });
const mapping: Mapping[] = JSON.parse(
  readFileSync(join(review, "mapping.json"), "utf8"),
);
const clips = mapping.map((clip) => ({
  ...clip,
  samples: JSON.parse(
    readFileSync(join(review, "trajectories", `${clip.protocol}.json`), "utf8"),
  ).samples as GaitKeypointSample[],
}));
const sourcePath = join(
  root,
  "app-next/src/packages/unlock/lib/gait/WindowedGaitDetector.ts",
);
const source = readFileSync(sourcePath, "utf8");
const sourceHash = createHash("sha256").update(source).digest("hex");
function stream(
  Detector: typeof WindowedGaitDetector,
  samples: GaitKeypointSample[],
  start = 0,
): Decision {
  const detector = new Detector({ startedAtMs: start });
  const result: Decision = {
    pass: null,
    lastWalking: null,
    firstRelease: null,
    lastReason: "noSamples",
    windows: [],
  };
  let lastEvaluation = -Infinity;
  for (const sample of samples) {
    if (sample.timestampMs < start) continue;
    const decision = detector.process(
      sample,
      sample.analysisTimestampMs ?? sample.timestampMs,
    );
    const walking = decision.complete && decision.classification === "walking";
    if (walking) {
      result.pass ??= sample.timestampMs;
      result.lastWalking = sample.timestampMs;
    } else if (result.pass !== null) result.firstRelease ??= sample.timestampMs;
    result.lastReason = decision.reason;
    if (decision.evaluatedAtMs !== lastEvaluation) {
      lastEvaluation = decision.evaluatedAtMs;
      result.windows.push({
        at: sample.timestampMs,
        walking,
        reason: decision.reason,
        rms: decision.rms,
        r: decision.r,
        r2: decision.r2,
      });
    }
  }
  return result;
}
function loss(clip: Mapping, result: Decision) {
  if (clip.take <= 6) return result.pass === null ? 1 : 0;
  if (clip.take === 19)
    return result.pass === null ? 1 : result.pass < 12_000 ? 1000 : 0;
  if (clip.take === 20)
    return result.pass === null
      ? 1
      : result.pass >= 13_000 || (result.lastWalking ?? Infinity) >= 14_000
        ? 1000
        : 0;
  return result.pass === null ? 0 : 1000;
}
const offsets = [0, 50, 100, 150, 200, 250, 500, 1000];
const candidates: {
  lateralCorrelation: number;
  correlation: number;
  rms: number;
  outcomes: {
    start: number;
    pass: number | null;
    lastWalking: number | null;
    loss: number;
  }[][];
}[] = [];
for (const correlation of [0.4, 0.5, 0.6])
  for (const rms of [0.01, 0.015, 0.02])
   for (const lateralCorrelation of [0.65, 0.7, 0.75]) {
    const path = join(output, `candidate-${correlation}-${rms}-${lateralCorrelation}.ts`);
    writeFileSync(
      path,
      source
        .replace("'./LateralGait'", JSON.stringify(join(root, "app-next/src/packages/unlock/lib/gait/LateralGait")))
        .replace(
          "'./GaitCorroboration'",
          JSON.stringify(
            join(
              root,
              "app-next/src/packages/unlock/lib/gait/GaitCorroboration",
            ),
          ),
        )
        .replace(
          `minRepeatCorrelation: ${GAIT_SETTINGS.minRepeatCorrelation}`,
          `minRepeatCorrelation: ${correlation}`,
        )
        .replace(`lateralCorrelation: ${GAIT_SETTINGS.lateralCorrelation}`, `lateralCorrelation: ${lateralCorrelation}`)
        .replace(`minRms: ${GAIT_SETTINGS.minRms}`, `minRms: ${rms}`),
    );
    const { WindowedGaitDetector: Detector } = (await import(path)) as {
      WindowedGaitDetector: typeof WindowedGaitDetector;
    };
    const outcomes = clips.map((clip) =>
      offsets.map((start) => {
        const result = stream(Detector, clip.samples, start);
        return {
          start,
          pass: result.pass,
          lastWalking: result.lastWalking,
          loss: loss(clip, result),
        };
      }),
    );
    candidates.push({ lateralCorrelation, correlation, rms, outcomes });
  }
const folds = clips.map((clip, held) => {
  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      trainingLoss: candidate.outcomes.reduce(
        (sum, outcomes, index) =>
          sum + (index === held ? 0 : outcomes.reduce((a, b) => a + b.loss, 0)),
        0,
      ),
      priorDistance:
        Math.abs(candidate.lateralCorrelation - 0.7) / 0.05 +
        Math.abs(candidate.correlation - 0.5) / 0.1 +
        Math.abs(candidate.rms - 0.015) / 0.005,
    }))
    .sort(
      (a, b) =>
        a.trainingLoss - b.trainingLoss || a.priorDistance - b.priorDistance,
    );
  const selected = ranked[0];
  return {
    heldOut: clip.original,
    lateralCorrelation: selected.lateralCorrelation,
    correlation: selected.correlation,
    rms: selected.rms,
    trainingLoss: selected.trainingLoss,
    outcomes: selected.outcomes[held],
  };
});
const outcomes = [];
for (const clip of clips) {
  const current = await replay(clip.samples);
  const shipped = await replay(clip.samples, true);
  const continuous = stream(WindowedGaitDetector, clip.samples);
  const transformations = [0.8, 0.9, 1].map((scale) => {
    const samples = clip.samples.map((sample) => ({
      ...sample,
      head: sample.head
        ? {
            ...sample.head,
            x: 0.5 + (sample.head.x - 0.5) * scale,
            y: 0.5 + (sample.head.y - 0.5) * scale,
            height: sample.head.height * scale,
          }
        : undefined,
    }));
    const result = stream(WindowedGaitDetector, samples);
    return {
      scale,
      pass: result.pass,
      lastWalking: result.lastWalking,
      loss: loss(clip, result),
    };
  });
  outcomes.push({
    original: clip.original,
    protocol: clip.protocol,
    take: clip.take,
    durationMs: clip.samples.at(-1)?.timestampMs,
    current,
    shipped,
    continuous,
    transformations,
  });
}
const report = {
  controllerEvidence: "See robustness report for full-stream production-controller qualification and stale-coverage release.",
  sourceHash,
  settings: GAIT_SETTINGS,
  limitations: [
    "Exploratory same-person leave-one-take-out after feature exploration; not independent population validation.",
    "Offsets and scale transformations are correlated versions of the same footage, not extra subjects or new observations.",
    "Only owner-authorized slow walking and deliberate bob are looped to 20 seconds in the prepared review. Other short no-pass clips are censored.",
    "Detector-only streams below omit controller continuity; the robustness report measures production-controller callbacks, not physical Screen Time shields.",
    "The stop fold permits up to one second of observation latency after the approximate 13-second boundary. It does not claim exact foot-contact timing.",
  ],
  candidates,
  folds,
  outcomes,
};
writeFileSync(
  join(output, "audit.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      sourceHash,
      clips: outcomes.map((clip) => ({
        original: clip.original,
        pass: clip.current.timeToPassMs,
        lastWalking: clip.continuous.lastWalking,
        reason: clip.current.reason,
      })),
      folds: folds.map((fold) => ({
        heldOut: fold.heldOut,
        lateralCorrelation: fold.lateralCorrelation,
      correlation: fold.correlation,
        rms: fold.rms,
        heldOutLoss: fold.outcomes.reduce((a, b) => a + b.loss, 0),
      })),
    },
    null,
    2,
  ),
);
