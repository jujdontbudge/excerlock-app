"""Home scenarios, retained-tab scrolling and live fake step unlock."""
from sim import *
out=ROOT/'evidence/T09';out.mkdir(exist_ok=True)
def capture(name):
 time.sleep(.7);screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()))
def scenario(name):
 open_url('excerlock://dev?scenario='+name);time.sleep(1.2);find('Hi, Alex',15);time.sleep(1.5)
with recording(out/'home-states.mp4'):
 for name in ['home-locked-walking','home-unlocked-met','home-walking-session','home-before-window','home-no-rules','home-permission-needed','home-no-apps','gym-arrival-user','gym-time-user','runner-distance','biker-time','multi-rule-overlap','window-crosses-midnight']:
  scenario(name);capture(name)
 scenario('home-before-window');open_url('excerlock://home?advance=50400000');find('No blocking right now');capture('home-after-window')
 scenario('home-before-window');open_url('excerlock://home?advance=432000000');find('No blocking right now');capture('home-no-rules-today')
 scenario('home-locked-walking');open_url('excerlock://dev');find('Pause all conditions');tap('Pause all conditions');tap('Open app');find('All conditions are paused');capture('home-all-paused')
with recording(out/'home-live-unlock.mp4'):
 scenario('home-before-window');find('Blocking starts at 9:00 AM');time.sleep(1);open_url('excerlock://home?advance=3600000');find('Apps are blocked');capture('live-locked');open_url('excerlock://home?steps=5000');find('Unlocked for the rest of today');capture('live-unlocked');time.sleep(2)
with recording(out/'home-tabs.mp4'):
 scenario('multi-rule-overlap');swipe(200,660,200,310);time.sleep(.7);capture('home-scrolled');tap('Conditions');time.sleep(.7);tap('Analytics');time.sleep(.7);tap('Settings');time.sleep(.7);tap('Home');time.sleep(.7);capture('home-retained-scroll')
print('Home scenarios and transitions captured')
