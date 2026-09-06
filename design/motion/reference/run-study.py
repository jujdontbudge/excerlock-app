"""Run T00 observations; one video per agy call, stdout always saved."""
from pathlib import Path
import argparse
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent

def run(app: str, start: int):
    folder = ROOT / 'design/research' / f'{app}-replay/segments'
    for clip in sorted(folder.glob('seg-*.mp4'))[start:]:
        index = int(clip.stem.split('-')[1])
        existing = HERE/'raw'/f'{app}-{index:02d}.md'
        if existing.exists():
            blocks = re.findall(r'```json\s*\n([\s\S]*?)```', existing.read_text())
            try:
                data = json.loads(blocks[-1])
                if 'screens' in data and 'motions' in data:
                    print(existing.stem, 'already has an index; review before rerunning', flush=True)
                    continue
            except (IndexError, json.JSONDecodeError):
                pass
            attempt = 1
            while (HERE/'raw'/f'{existing.stem}-incomplete-{attempt}.md').exists():
                attempt += 1
            for suffix in ['.md', '.prompt.txt', '.err.log']:
                previous = HERE/'raw'/f'{existing.stem}{suffix}'
                if previous.exists():
                    previous.rename(HERE/'raw'/f'{existing.stem}-incomplete-{attempt}{suffix}')
        prefix = {'otter': 'OT', 'appblock': 'AB', 'unrot': 'UN'}[app] + f'{index:02d}'
        prompt = f'''Watch the whole app screen recording at {clip}, every frame. Observe {app} only. No ExcerLock designs or recommendations. This 30 fps clip starts at global second {index * 180}. Return complete raw observations, not a progress report. Use actual visual image/video viewing, not OCR alone. Earlier drafts hallucinated yellow OtterLife buttons when source frames show purple: verify colors and geometry visually. Never fabricate precision. Frame-difference magnitudes are NOT element displacement; only call positions measured when backed by actual coordinates and frame indices. Otherwise label an estimate or unavailable. Do not infer native framework classes or haptics from pixels. Keep the report compact using tables (up to 3500 words), while covering every distinct screen and interaction.
INVENTORY: every screen/state in order, IDs {prefix}-S001 onward, local and global timestamps in seconds, visible title/copy, top-to-bottom layout regions, component types, fixed versus scrolling content, tab names/presence, every Settings row and group if visible.
MOTION: every transition and micro-interaction, IDs {prefix}-M001 onward, local timestamp in decimal seconds, elements/properties, direction, measured start/end frames and duration milliseconds, easing character, overshoot, sibling stagger, tap versus gesture, per-frame displacement samples where discernible. Distinguish observations from estimates. Do not claim haptics from video.
End with one JSON fenced block containing screens: [{{"id": "{prefix}-S001", "time_seconds": 0, "title": "..."}}] and motions: [{{"id": "{prefix}-M001", "time_seconds": 0, "duration_ms": 0, "description": "..."}}] for frame extraction. Use actual local times within the clip. Explicitly state unreadable or missing coverage. Do not modify project files. Use scratch space for analysis if needed. Finish the analysis before returning.'''
        stem = f'{app}-{index:02d}'
        (HERE/'raw'/f'{stem}.prompt.txt').write_text(prompt)
        with (HERE/'raw'/f'{stem}.md').open('w') as out, (HERE/'raw'/f'{stem}.err.log').open('w') as err:
            result = subprocess.run(['agy', '-p', prompt, '--model', 'gemini-3.7-flash-high',
                '--dangerously-skip-permissions', '--add-dir', str(folder)], stdout=out, stderr=err)
        print(stem, 'exit', result.returncode, flush=True)
        if result.returncode:
            break

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('app', choices=['otter', 'appblock', 'unrot'])
    parser.add_argument('--start', type=int, default=0)
    args = parser.parse_args()
    run(args.app, args.start)
