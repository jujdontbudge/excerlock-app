"""Cold launch of the clean product, acknowledging first-run dev-client host chrome."""
from sim import *
out=ROOT/'evidence/T16'
subprocess.run(['xcrun','simctl','terminate',SIM,'com.johansardar.excerlock'],capture_output=True)
with recording(out/'cold-L0-O01.mp4'):
 open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091')
 deadline=time.monotonic()+60
 while time.monotonic()<deadline:
  labels=[n.get('AXLabel') for n in tree()]
  if 'Get started' in labels:break
  if 'Open in “ExcerLock”?' in labels:tap('Open')
  elif 'This is the developer menu. It gives you access to useful tools in development builds.' in labels:tap('Continue')
  elif 'Reload' in labels and 'Close' in labels:tap('Close')
  time.sleep(.4)
 find('Get started');time.sleep(1)
 screenshot(out/'cold-O01.png');(out/'cold-O01.json').write_text(json.dumps(tree()))
print('PASS clean product: cold launch reaches O01',flush=True)
