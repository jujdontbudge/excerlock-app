"""Verify native preference switch outcomes after scrolling has settled."""
from sim import *
from visible_tap import visible_tap as tap
out=ROOT/'evidence/T16'
def switch(title):return next(n for n in tree() if n.get('type')=='CheckBox' and n.get('AXLabel')==title)
def press_switch(title):
 for _ in range(10):
  n=switch(title);f=n['frame']
  if 100<f['y']<680:break
  if f['y']<100:swipe(200,260,200,660,.4)
  else:swipe(200,660,200,260,.4)
  time.sleep(1.2)
 else:raise AssertionError('Switch remained offscreen: '+title)
 time.sleep(.6);f=switch(title)['frame'];run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']/2),round(f['y']+f['height']/2),'--duration','.2');time.sleep(.8)
def capture(name):screenshot(out/(name+'.png'));(out/(name+'.json')).write_text(json.dumps(tree()));print('PASS',name,flush=True)
with recording(out/'preferences-final.mp4'):
 if any(n.get('AXLabel')=='Dismiss sheet' for n in tree()):tap('Close');time.sleep(1)
 open_url('excerlock://dev?scenario=home-locked-walking');time.sleep(1.5);open_url('excerlock://settings');time.sleep(2)
 before=switch('Touch feedback')['AXValue'];press_switch('Touch feedback');assert switch('Touch feedback')['AXValue']!=before;capture('touch-feedback-toggled')
 press_switch('Gym auto-detect');find('Allow location access all the time?');tap('Don’t allow');time.sleep(1);assert switch('Gym auto-detect')['AXValue']=='0';capture('auto-detect-denied')
 press_switch('Gym auto-detect');find('Allow location access all the time?');tap('Allow');time.sleep(1);assert switch('Gym auto-detect')['AXValue']=='1';capture('auto-detect-granted')
 press_switch('Gym auto-detect');assert switch('Gym auto-detect')['AXValue']=='0';capture('auto-detect-disabled')
print('Preference outcomes verified',flush=True)
