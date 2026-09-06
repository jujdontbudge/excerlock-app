import sys,time,json
from sim import *
run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock')
open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(3)
open_url('excerlock://dev?scenario=fresh-install');time.sleep(2)
choices={5:'Friend',6:'25–34',7:'Employed',8:'More exercise',9:'Focus on what matters',20:'Walking'}
with recording(ROOT/'evidence/T04/onboarding-O01-O20.mp4'):
 for i in range(1,21):
  step='O'+str(i).zfill(2)
  if i==4:
   time.sleep(.5);run('idb','ui','text','--udid',SIM,'Alex')
  if i in choices:tap(choices[i])
  time.sleep(6 if i==12 else 2 if i in [11,13,14,16,17,18] else .7)
  nodes=tree();labels=[x.get('AXLabel') or '' for x in nodes]
  assert not any('Render Error' in x or 'Uncaught Error' in x for x in labels),labels
  screenshot(ROOT/f'evidence/T04/{step}-default.png');(ROOT/f'evidence/T04/{step}-default.json').write_text(json.dumps(nodes))
  print(step,flush=True)
  tap('Get started' if i==1 else 'Continue');time.sleep(.55)
find('W1')
print('Reached W1',flush=True)
