"""Native proof that today's recap shares fake sensor facts, plus resized picker motion."""
from sim import *
from visible_tap import visible_tap as tap
out=ROOT/'evidence/T16'
def go(path):open_url('excerlock://'+path);time.sleep(1.2)
def capture(name):time.sleep(.8);screenshot(out/(name+'.png'));(out/(name+'.json')).write_text(json.dumps(tree()));print('PASS',name,flush=True)
def reveal(label):
 for _ in range(10):
  f=find(label)['frame']
  if 80<f['y']<650:return
  swipe(200,660,200,250,.5);time.sleep(.6)
 raise AssertionError(label)
with recording(out/'live-analytics-and-picker.mp4'):
 go('dev?scenario=home-locked-walking');go('home?steps=5432');find('Unlocked for the rest of today');capture('steps-home')
 go('analytics');find('5,432 steps');reveal('Your weekly recap');capture('steps-recap')
 go('dev?scenario=gym-time-user');tap('Check in');find('You’re close enough to check in.');tap('Check in');find('You’re checked in');tap('Done');time.sleep(.9);go('home?advance=1080000');find('Unlocked for the rest of today');capture('gym-minutes-home')
 go('analytics');find('30 minutes');reveal('Your weekly recap');capture('gym-minutes-recap')
 go('dev?scenario=home-locked-walking');go('settings/gyms');tap('Add gym');find('Choose your gym');time.sleep(1);capture('six-place-picker')
 field=next(n for n in tree() if n.get('AXLabel')=='Search for a gym' and n.get('type')=='TextField')['frame'];run('idb','ui','tap','--udid',SIM,round(field['x']+field['width']/2),round(field['y']+field['height']/2));run('idb','ui','text','--udid',SIM,'River');time.sleep(1);capture('filtered-picker-search');tap('Close');time.sleep(1)
print('Current-day activity and picker reflow captured',flush=True)
