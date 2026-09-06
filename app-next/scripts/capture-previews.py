"""Capture the real gallery at both content sizes; simctl/idb only."""
import json, re, subprocess, time
from PIL import Image
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sim = 'B68873CD-B6ED-4961-85AF-0C807E657999'
names = re.findall(r"'([^']+)'", (root/'src/design-system/__previews__/names.ts').read_text())
out = root/'evidence/T02'; out.mkdir(parents=True, exist_ok=True)
def run(*args):
 return subprocess.run(args, check=True, capture_output=True, text=True).stdout
subprocess.run(['xcrun','simctl','terminate',sim,'com.johansardar.excerlock'], capture_output=True)
run('xcrun','simctl','openurl',sim,'excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091')
time.sleep(2)
for size, category in [('normal','large'), ('xl','accessibility-large')]:
 run('xcrun','simctl','ui',sim,'content_size',category)
 if size == 'xl': run('xcrun','simctl','spawn',sim,'defaults','write','-g','UIPreferredContentSizeCategoryName','UICTContentSizeCategoryAccessibilityL')
 for index, name in enumerate(names):
  for variant in ['default','alternate']:
   run('xcrun','simctl','openurl',sim,f'excerlock://dev?component={name}&variant={variant}')
   time.sleep(3.5 if name == 'DotGrid' else 1.2)
   tree = json.loads(run('idb','ui','describe-all','--udid',sim))
   labels = [x.get('AXLabel','') for x in tree]
   if any('Uncaught Error' in (label or '') for label in labels): raise RuntimeError(labels)
   stem=f'{name}-{variant}-{size}'
   (out/f'{stem}.json').write_text(json.dumps(tree))
   for retry in range(12):
    run('xcrun','simctl','io',sim,'screenshot',str(out/f'{stem}.png'))
    r,g,b=Image.open(out/f'{stem}.png').convert('RGB').getpixel((5,5))
    if b <= r+50: break
    time.sleep(.3)
   else: raise RuntimeError(f'Development refresh overlay persisted: {stem}')
  print(f'{size}: {index+1}/{len(names)} {name}', flush=True)
run('xcrun','simctl','ui',sim,'content_size','large')
run('xcrun','simctl','spawn',sim,'defaults','delete','-g','UIPreferredContentSizeCategoryName')
