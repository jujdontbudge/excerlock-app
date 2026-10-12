import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { replayContinuous } from './replay';
import type { GaitKeypointSample } from '../../app-next/src/packages/ports/GaitVisionProvider';
const review = resolve(process.argv[2]);
const output = resolve(process.argv[3] ?? '.excer/treadmill-loop/robustness');
mkdirSync(output, { recursive: true });
const mapping: { original: string; protocol: string; take: number }[] = JSON.parse(readFileSync(join(review, 'mapping.json'), 'utf8'));
const variants = [
  { name: 'original' },
  { name: 'mirror', mirror: true },
  { name: 'scale-0.8-offset', scale: 0.8, offset: 0.05 },
  { name: 'crop-1.1', scale: 1.1 },
  { name: 'drop-every-5', drop: 5 },
  { name: 'drop-every-3', drop: 3 },
  { name: 'jitter', jitter: 8 },
  { name: 'noise', noise: 0.003 },
  { name: 'speed-0.85', speed: 0.85 },
  { name: 'speed-1.15', speed: 1.15 },
  ...[50, 100, 150, 200, 250, 500, 1000].map((start) => ({ name: `start-${start}`, start })),
] as { name: string; mirror?: boolean; scale?: number; offset?: number; drop?: number; jitter?: number; noise?: number; speed?: number; start?: number }[];
const results = [];
for (const clip of mapping) {
  const original: GaitKeypointSample[] = JSON.parse(readFileSync(join(review, 'trajectories', `${clip.protocol}.json`), 'utf8')).samples;
  for (const variant of variants) {
    let randomState = 714;
    const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) | 0; return (randomState >>> 0) / 4294967296; };
    const scale = variant.scale ?? 1, speed = variant.speed ?? 1;
    const samples = original.filter((_, index) => !variant.drop || index % variant.drop !== 0).map((sample) => {
      const transform = (point: { x: number; y: number; confidence: number }) => ({
        ...point,
        x: 0.5 + (point.x - 0.5) * scale * (variant.mirror ? -1 : 1) + (variant.offset ?? 0) + (random() - 0.5) * (variant.noise ?? 0) * (sample.head?.height ?? 0.2),
        y: 0.5 + (point.y - 0.5) * scale + (variant.offset ?? 0) + (random() - 0.5) * (variant.noise ?? 0) * (sample.head?.height ?? 0.2),
      });
      return {
        ...sample,
        timestampMs: sample.timestampMs / speed + (random() - 0.5) * (variant.jitter ?? 0),
        head: sample.head ? { ...transform(sample.head), height: sample.head.height * scale } : undefined,
        landmarks: Object.fromEntries(Object.entries(sample.landmarks).map(([name, point]) => [name, transform(point)])),
      };
    });
    const result = await replayContinuous(samples, variant.start ?? 0);
    const pass = result.transitions.find((transition) => transition.qualified)?.at ?? null;
    const stopAt = 13000 / speed;
    const release = result.transitions.find((transition) => !transition.qualified && transition.at >= stopAt)?.at ?? null;
    const latePass = result.transitions.some((transition) => transition.qualified && release !== null && transition.at > release);
    const passed = clip.take <= 6 ? pass !== null : clip.take === 19 ? pass !== null && pass >= 12000 / speed && pass <= 17000 / speed : clip.take === 20 ? pass !== null && pass < stopAt && release !== null && release <= stopAt + 3000 / speed && !latePass : pass === null;
    results.push({ clip: clip.protocol, take: clip.take, variant: variant.name, pass, release, passed, ...result });
  }
}
writeFileSync(join(output, 'report.json'), JSON.stringify({ variants, results }, null, 2));
console.log(JSON.stringify({ total: results.length, failures: results.filter((result) => !result.passed), original: results.filter((result) => result.variant === 'original') }, null, 2));
