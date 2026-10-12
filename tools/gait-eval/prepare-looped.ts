import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const review = resolve(process.argv[2]);
const movies = resolve(process.argv[3]);
const output = resolve(process.argv[4] ?? '.excer/treadmill-loop/prepared');
mkdirSync(join(output, 'trajectories'), { recursive: true });
for (const name of ['mapping.json', 'labels.json']) copyFileSync(join(review, name), join(output, name));
for (const name of readdirSync(join(review, 'trajectories'))) {
  if (name.endsWith('.json')) copyFileSync(join(review, 'trajectories', name), join(output, 'trajectories', name));
}
const loops = [];
for (const name of ['walk-session-one-slow-head.MOV', 'bob-session-one-deliberate.MOV']) {
  const source = join(movies, name), loop = join(output, `${name}.mp4`);
  const durationMs = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', source], { encoding: 'utf8' }).trim()) * 1000;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-stream_loop', '-1', '-i', source, '-t', '20', '-an', '-c:v', 'libx264', '-crf', '18', loop], { stdio: 'inherit' });
  execFileSync('swift', ['tools/gait-fixture-extractor/extract.swift', loop, join(output, 'trajectories', `${name}.json`)], { stdio: 'inherit' });
  loops.push({ name, durationMs, sourceSha256: createHash('sha256').update(readFileSync(source)).digest('hex'), seamsMs: Array.from({ length: Math.floor(20000 / durationMs) }, (_, index) => (index + 1) * durationMs) });
}
writeFileSync(join(output, 'loops.json'), JSON.stringify({ durationMs: 20000, loops }, null, 2));
