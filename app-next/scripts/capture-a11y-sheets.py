"""Native modal isolation, keyboard avoidance and reduced-motion live changes."""
from sim import *
import sys
mode=sys.argv[1] if len(sys.argv)>1 else 'xl';out=ROOT/'evidence/T14'/mode
out.mkdir(parents=True,exist_ok=True)
def go(path):open_url('excerlock://'+path);time.sleep(1)
def capture(name):
 time.sleep(.7);screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()));print(mode,name,flush=True)
base_tap=tap
def tap(label):
 for _ in range(8):
  nodes=[n for n in tree() if n.get('AXLabel')==label];nodes.sort(key=lambda n:n.get('type')!='Button')
  if nodes:
   f=nodes[0]['frame'];center=f['y']+f['height']/2
   limit=765 if any(n.get('AXLabel')=='Home' for n in tree()) else 835
   if 65<center<limit:base_tap(label);return
   swipe(200,670,200,250,.5);time.sleep(.6)
  else:time.sleep(.4)
 base_tap(label)
def close():tap('Close');time.sleep(.9)
run('xcrun','simctl','ui',SIM,'content_size','accessibility-large' if mode=='xl' else 'large');run('xcrun','simctl','spawn',SIM,'defaults','write','com.apple.Accessibility','ReduceMotionEnabled','-bool','YES' if mode=='reduced' else 'NO');run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock');go('expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(3)
with recording(out/'sheets-and-live.mp4'):
 go('dev?scenario=home-no-rules');find('No conditions yet');capture('home-no-rules')
 go('dev?scenario=gym-arrival-user');tap('Check in');time.sleep(.9);capture('checkin-outside');assert not any(n.get('AXLabel') in ['Home','Conditions','Analytics','Settings'] for n in tree()),'Underlying tabs still exposed';go('home?presence=inside');tap('Check in');find('You’re checked in');capture('checkin-success');tap('Done');time.sleep(.9)
 go('dev?scenario=home-walking-session');go('home?advance=18000');tap('Start a walk');capture('walk-ended');tap('Done');time.sleep(.9);tap('Start a walk');time.sleep(.9);tap('Start walking');capture('walk-verifying');find('Keep moving',10);capture('walk-live');find('Keep walking to stay unlocked',10);capture('walk-grace');find('Walk complete',10);capture('walk-summary');tap('Done');time.sleep(.9)
 go('dev?scenario=home-locked-walking');capture('home-locked');go('home?steps=5000');find('Unlocked for the rest of today');capture('home-unlocked')
 go('settings/support');n=next(n for n in tree() if n.get('AXLabel')=='Your message' and n.get('type') in ['TextArea','TextField']);f=n['frame']
 if f['y']>680:swipe(200,650,200,230,.5);time.sleep(.7);n=next(n for n in tree() if n.get('AXLabel')=='Your message' and n.get('type') in ['TextArea','TextField']);f=n['frame']
 run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']/2),round(f['y']+f['height']/2));run('idb','ui','text','--udid',SIM,'A clear keyboard view');capture('support-keyboard');tap('Send message');find('Message sent');capture('support-success')
 go('settings/gyms');tap('Add gym');time.sleep(.8);capture('gym-picker');close()
 go('home');tap('Locked apps, 3 apps · 1 category');time.sleep(.8);capture('apps-picker');close()
with recording(out/'home-extra-states.mp4'):
 for scenario in ['gym-time-user','runner-distance','biker-time']:
  go('dev?scenario='+scenario);capture(scenario)
 go('dev?scenario=home-before-window');go('home?advance=50400000');capture('home-after-window')
 go('dev?scenario=home-before-window');go('home?advance=432000000');capture('home-no-rules-today')
 go('dev?scenario=home-locked-walking');go('dev');tap('Pause all conditions');go('home');capture('home-all-paused')
print('Modal isolation, session states, live Home unlock, support keyboard and pickers passed',mode)
