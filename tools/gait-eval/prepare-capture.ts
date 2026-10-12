import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const review = resolve(process.argv[2]);
const movies = resolve(process.argv[3]);
const loops = resolve(process.argv[4]);
const output = resolve(process.argv[5]);
const mapping: { protocol: string; take: number }[] = JSON.parse(readFileSync(join(review, 'mapping.json'), 'utf8'));
const captures = [];
for (const fps of [20, 15]) {
  const directory = join(output, `capture-${fps}`);
  mkdirSync(directory, { recursive: true });
  for (const clip of mapping) {
    const source = clip.take === 1 || clip.protocol.startsWith('bob-') ? join(loops, `${clip.protocol}.mp4`) : join(movies, clip.protocol);
    const video = join(directory, `${clip.protocol}.mp4`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', source, '-vf', `fps=${fps}`, '-an', '-c:v', 'libx264', '-crf', '18', video], { stdio: 'inherit' });
    execFileSync('swift', ['tools/gait-fixture-extractor/extract.swift', video, join(directory, `${clip.protocol}.json`), String(fps)], { stdio: 'inherit' });
    captures.push({ clip: clip.protocol, fps, source, video });
  }
}
writeFileSync(join(output, 'captures.json'), JSON.stringify(captures, null, 2));
