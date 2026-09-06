"""Gym picker and distinct Always permission upgrade, using the accessibility tree."""
from sim import *
out=ROOT/'evidence/T08'
def capture(name):
 time.sleep(.7);screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()))
def switch():
 n=[x for x in tree() if x.get('type') in ('Switch','CheckBox') and x.get('AXLabel')=='Auto-detect arrivals'][0];f=n['frame'];run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']*.75),round(f['y']+f['height']/2),'--duration','0.2')
def visible(label):
 for i in range(5):
  nodes=[x for x in tree() if x.get('AXLabel')==label]
  if nodes and nodes[0]['frame']['y']<700:return
  swipe(210,640,210,330,.5)
 raise AssertionError(label)
open_url('excerlock://dev?scenario=gym-arrival-user&setup=X3');time.sleep(2)
with recording(out/'setup-gym.mp4'):
 find('Find your gym');capture('X3-gym');tap('Choose a gym');find('Choose your gym');capture('gym-picker');visible('River North Gym');tap('River North Gym');visible('Gym name');capture('gym-name');tap('Save gym');find('Find your gym');capture('gym-saved');switch();find('Allow location access all the time?');capture('always-prompt');tap('Don’t allow');find('Find your gym');capture('always-denied');switch();find('Allow location access all the time?');tap('Allow');find('Find your gym');capture('always-granted');tap('Continue');find('Save your progress');tap('Skip for now');find("You're all set");capture('X5-gym')
print('Gym picker and Always grant/deny captured')
