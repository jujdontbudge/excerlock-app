import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

export function reviewVideo(dir: string, videoStartedAtMs: number, launchedAtMs: number, firstInteractiveMs: number | null,
  events: { event: string; at: number }[]) {
  const segments = [
    { name: 'launch', start: (launchedAtMs - videoStartedAtMs) / 1000, duration: (firstInteractiveMs ?? 8500) / 1000 + 0.2 },
    ...events.filter((event) => event.event === 'reload-start').map((start, index) => ({ name: `reload-${index + 1}`,
      start: Math.max(0, (start.at - videoStartedAtMs) / 1000 - 0.3),
      duration: Math.min(10, ((events.find((event) => event.event === 'native-cover-hidden' && event.at > start.at)?.at ?? start.at + 8000) - start.at) / 1000 + 0.7) })),
  ];
  const reviews = segments.map((segment) => {
    const frames = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(segment.start), '-i', join(dir, 'video.mp4'), '-t', String(segment.duration),
      '-vf', 'fps=30,crop=iw*0.8:ih*0.7:iw*0.1:ih*0.15,scale=48:96', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
    if (frames.status !== 0 || !frames.stdout.length) throw new Error(`Video review unavailable: ${frames.stderr.toString()}`);
    const bytes = 48 * 96 * 3;
    let contentSeen = segment.name !== 'launch';
    const blankAtSeconds: number[] = [];
    for (let offset = 0; offset + bytes <= frames.stdout.length; offset += bytes) {
      let min = 255;
      let max = 0;
      for (let pixel = offset; pixel < offset + bytes; pixel++) { min = Math.min(min, frames.stdout[pixel]!); max = Math.max(max, frames.stdout[pixel]!); }
      const blank = min > 180 && max - min < 16;
      if (!blank) contentSeen = true;
      else if (contentSeen) blankAtSeconds.push(Number((segment.start + offset / bytes / 30).toFixed(3)));
    }
    const montage = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(segment.start), '-i', join(dir, 'video.mp4'), '-t', String(segment.duration),
      '-vf', `fps=${segment.name === 'launch' ? 3 : 12},scale=164:-1,tile=8x4`, '-frames:v', '1', '-y', join(dir, `${segment.name}-review.png`)], { timeout: 30000 });
    if (montage.status !== 0) throw new Error(`Video montage unavailable: ${montage.stderr.toString()}`);
    return { ...segment, blankAtSeconds };
  });
  const result = { status: reviews.some((review) => review.blankAtSeconds.length) ? 'fail' : 'pass', method: 'Uniform pale frames after visible content at 30 fps; inspect contact sheets and video for other artifacts.', segments: reviews };
  writeFileSync(join(dir, 'visual-review.json'), JSON.stringify(result, null, 2));
  return result;
}
