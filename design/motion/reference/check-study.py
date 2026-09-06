"""Check T00 completeness without converting partial drafts into accepted evidence."""
import importlib.util
from pathlib import Path
import re
import sys

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('frames', HERE/'extract-frames.py')
frames = importlib.util.module_from_spec(spec)
spec.loader.exec_module(frames)

missing = []
for app, count in [('otter', 9), ('appblock', 4), ('unrot', 2)]:
    for index in range(count):
        stem = 'otterlife-00' if app == 'otter' and index == 0 else f'{app}-{index:02d}'
        path = HERE/'raw'/f'{stem}.md'
        try:
            data = frames.read_index(path)
        except (FileNotFoundError, ValueError) as error:
            missing.append(f'{stem}: {error}')
            continue
        ids = []
        for key in ['screens', 'motions']:
            for entry in data[key]:
                ident = entry['id']
                ids.append(ident)
                if not (HERE/'strips'/f'{app}-{ident}.png').exists():
                    missing.append(f'{stem}: missing strip/frame {ident}')
        if len(ids) != len(set(ids)):
            missing.append(f'{stem}: duplicate IDs')
        if not data['screens'] or not data['motions']:
            missing.append(f'{stem}: empty observation list')
        print(f'{stem}: {len(data["screens"])} screens, {len(data["motions"])} motions')
for app in ['otterlife', 'appblock', 'unrot']:
    for kind in ['inventory', 'motion']:
        if not (HERE/f'{kind}-{app}.md').exists():
            missing.append(f'missing {kind}-{app}.md')
if missing:
    print('\nNOT COMPLETE:')
    print('\n'.join(missing))
    sys.exit(1)
print('\nFiles complete. This does not replace source-frame review or resolve quality notes.')
