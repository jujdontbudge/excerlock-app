import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  WindowedGaitDetector,
  GAIT_SETTINGS,
} from "../../app-next/src/packages/unlock/lib/gait/WindowedGaitDetector";
import { GaitPeriodicityDetector } from "./LegacyDetector";
import type { GaitKeypointSample } from "../../app-next/src/packages/ports/GaitVisionProvider";
const root = resolve(import.meta.dirname, "../..");
let seed = 7;
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const gauss = () =>
  Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-9))) *
  Math.cos(2 * Math.PI * rand());
const cases: [string, number, number, number, number, (t: number) => number][] =
  [
    ["still-0.5px", 0.001, 0.001, 0.2, 0, () => 0],
    ["still-1px", 0.002, 0.002, 0.18, 0, () => 0],
    ["still-1.4px", 0.003, 0.003, 0.16, 0.05, () => 0],
    ["still-1.9px", 0.004, 0.004, 0.14, 0.1, () => 0],
    ["still-2.9px", 0.006, 0.006, 0.12, 0.15, () => 0],
    ["still-4.8px", 0.01, 0.01, 0.1, 0.15, () => 0],
    [
      "talk-irregular",
      0.004,
      0.004,
      0.16,
      0.05,
      (t) =>
        0.006 *
        Math.sin((2 * Math.PI * (3 + 2 * Math.sin(t / 700)) * t) / 1000),
    ],
    [
      "shift-slow",
      0.003,
      0.003,
      0.16,
      0.05,
      (t) => 0.02 * Math.sin((2 * Math.PI * 0.4 * t) / 1000),
    ],
    [
      "bob-deliberate",
      0.003,
      0.003,
      0.16,
      0.05,
      (t) => 0.02 * Math.sin((2 * Math.PI * 2 * t) / 1000),
    ],
  ];
const results = [];
for (const [name, sy, sh, height, drop, extra] of cases) {
  let newPasses = 0,
    oldPasses = 0;
  const times: number[] = [],
    oldTimes: number[] = [];
  for (let i = 0; i < 400; i++) {
    const current = new WindowedGaitDetector({ startedAtMs: 0 });
    let legacy = new GaitPeriodicityDetector({ startedAtMs: 0 }),
      began = 0,
      newPass = false,
      oldPass = false;
    for (let t = 0; t < 30_000; t += 1000 / 15) {
      if (t >= began + 5000) {
        began = t;
        legacy = new GaitPeriodicityDetector({ startedAtMs: t });
      }
      if (rand() < drop) continue;
      const sample = {
        timestampMs: Math.max(0, t + gauss() * 4),
        landmarks: {},
        head: {
          x: 0.5,
          y:
            0.42 +
            0.004 * Math.sin((2 * Math.PI * 0.25 * t) / 1000) +
            gauss() * sy +
            extra(t),
          height: height + gauss() * sh,
          confidence: 0.9,
        },
      };
      const a = current.process(sample),
        b = legacy.process(sample);
      if (!newPass && a.classification === "walking" && a.complete) {
        newPass = true;
        newPasses++;
        times.push(t);
      }
      if (!oldPass && b.classification === "walking" && b.complete) {
        oldPass = true;
        oldPasses++;
        oldTimes.push(t);
      }
    }
  }
  const median = (v: number[]) =>
    v.length ? v.sort((a, b) => a - b)[Math.floor(v.length / 2)] : null;
  const result = {
    name,
    attempts: 400,
    jitterPixels: sy * 480,
    drop,
    newPasses,
    oldPasses,
    medianPassMs: median(times),
    oldMedianPassMs: median(oldTimes),
  };
  results.push(result);
  console.log(result);
}
const nativeCases = [];
for (const name of [
  "stable-background",
  "shaking-background",
  "unreliable-background",
  "alternating-knees",
  "still-knees",
  "late-frames",
  "empty-frames",
]) {
  const detector = new WindowedGaitDetector({ startedAtMs: 0 });
  let passAt: number | null = null,
    reason = "warmingUp";
  const reasons: Record<string, number> = {};
  for (let i = 0; i <= 450; i++) {
    const t = (i * 1000) / 15;
    const phase = (2 * Math.PI * 1.67 * t) / 1000;
    const wave = 0.02 * Math.sin(phase);
    const previousWave =
      0.02 * Math.sin((2 * Math.PI * 1.67 * (t - 1000 / 15)) / 1000);
    const sample: GaitKeypointSample = {
      timestampMs: t,
      captureTimestampMs: t,
      analysisTimestampMs: t,
      sequence: i,
      head: { x: 0.5, y: 0.42 + wave, height: 0.2, confidence: 0.9 },
      landmarks: name.includes("knees")
        ? {
            leftHip: { x: 0.4, y: 0.6 + wave, confidence: 0.9 },
            rightHip: { x: 0.6, y: 0.6 + wave, confidence: 0.9 },
            leftKnee: {
              x: 0.4,
              y:
                0.8 +
                wave +
                (name === "alternating-knees" ? 0.02 * Math.sin(phase / 2) : 0),
              confidence: 0.9,
            },
            rightKnee: {
              x: 0.6,
              y:
                0.8 +
                wave -
                (name === "alternating-knees" ? 0.02 * Math.sin(phase / 2) : 0),
              confidence: 0.9,
            },
          }
        : {},
      cameraMotion: {
        x: 0,
        y: name === "shaking-background" ? wave - previousWave : 0,
        quality: name === "unreliable-background" ? 0 : 1,
      },
      empty: name === "empty-frames" && i % 30 === 0,
    };
    const result = detector.process(
      sample,
      t + (name === "late-frames" ? 201 : 0),
    );
    reason = result.reason;
    reasons[reason] = (reasons[reason] ?? 0) + 1;
    if (result.complete && result.classification === "walking") {
      passAt = t;
      break;
    }
  }
  const result = { name, passAt, reason, reasons, synthetic: true };
  nativeCases.push(result);
  console.log(result);
}
const fixtures = [];
for (const name of [
  "real-console-head",
  "real-walk-single",
  "real-walk-group",
]) {
  const raw = JSON.parse(
    readFileSync(join(process.argv[2], `${name}.json`), "utf8"),
  );
  const samples = Array.isArray(raw) ? raw : raw.samples;
  const detector = new WindowedGaitDetector({ startedAtMs: 0 });
  let passAt: number | null = null,
    last;
  const reasons: Record<string, number> = {};
  for (const s of samples) {
    last = detector.process({ ...s, landmarks: s.landmarks ?? {} });
    reasons[last.reason] = (reasons[last.reason] ?? 0) + 1;
    if (passAt === null && last.complete && last.classification === "walking")
      passAt = s.timestampMs;
  }
  fixtures.push({ name, passAt, last, reasons });
  console.log(fixtures[fixtures.length - 1]);
}
const dir = join(root, ".excer/gait-eval/calibration");
mkdirSync(dir, { recursive: true });
writeFileSync(
  join(dir, "report.json"),
  `${JSON.stringify({ settings: GAIT_SETTINGS, seed: 7, results, nativeCases, fixtures }, null, 2)}\n`,
);
