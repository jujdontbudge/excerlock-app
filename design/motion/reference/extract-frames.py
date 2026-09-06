"""Extract source-only frame strips from Gemini's completed timestamp indexes."""
import argparse
import json
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]

def read_index(path):
    blocks = re.findall(r'```(?:json)?\s*\n([\s\S]*?)```', path.read_text())
    for block in reversed(blocks):
        try:
            result = json.loads(block)
        except json.JSONDecodeError:
            continue
        if isinstance(result, dict) and 'screens' in result and 'motions' in result:
            return result
    raise ValueError(f'{path.name}: no complete machine-readable timestamp index')

def extract(path):
    match = re.fullmatch(r'(otterlife|otter|appblock|unrot)-(\d+)', path.stem)
    if not match:
        return
    app, index = match.groups()
    app = 'otter' if app == 'otterlife' else app
    clip = ROOT/'design/research'/f'{app}-replay/segments/seg-{index}.mp4'
    data = read_index(path)
    duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
        'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(clip)]))
    rows = []
    for kind, entries in [('screens', data['screens']), ('motions', data['motions'])]:
        for entry in entries:
            ident = entry['id']
            if not re.fullmatch(r'[A-Za-z0-9_-]+', ident):
                raise ValueError(f'Unsafe id: {ident}')
            timestamp = float(entry['time_seconds'])
            if not 0 <= timestamp < duration:
                raise ValueError(f'{ident}: {timestamp} outside {duration}')
            target = HERE/'strips'/f'{app}-{ident}.png'
            if kind == 'motions':
                # 15 frames at 12 fps span 1.25 seconds; pad only at clip boundary.
                start = max(0, timestamp - 0.2)
                filters = 'fps=12,scale=200:-2,tpad=stop_mode=clone:stop_duration=1.25,tile=15x1'
            else:
                start = timestamp
                filters = 'scale=270:-2'
            if not target.exists():
                subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-ss',str(start),
                    '-i',str(clip),'-vf',filters,'-frames:v','1','-update','1',str(target)],check=True)
            rows.append({'kind':kind, 'id':ident, 'clip':str(clip.relative_to(ROOT)),
                'local_seconds':timestamp, 'global_seconds':int(index)*180+timestamp,
                'file':str(target.relative_to(HERE))})
    (HERE/'raw'/f'{path.stem}.frames.json').write_text(json.dumps(rows,indent=2)+'\n')
    print(path.stem, len(rows), 'frames/strips', flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('raw', nargs='+', type=Path)
    args = parser.parse_args()
    for path in args.raw:
        extract(path)
