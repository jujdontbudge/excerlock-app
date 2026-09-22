"""Exercise schedule, time wheel, summary edits, and the plan-to-trial transition."""
from sim import *
out=ROOT/'evidence/T06';out.mkdir(exist_ok=True)
def capture(name):
 time.sleep(1);screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()))
def control(label):
 nodes=[n for n in tree() if n.get('AXLabel')==label and n.get('type')!='StaticText'];f=nodes[-1]['frame'];run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']/2),round(f['y']+f['height']/2),'--duration','0.2')
run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock')
open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(3)
open_url('excerlock://dev?scenario=fresh-install');time.sleep(2)
open_url('excerlock://onboarding/S1');find('When should blocking be active?');time.sleep(1)
with recording(out/'plan-flow.mp4'):
 capture('S1')
 for label in ['Mon','Tue','Wed','Thu','Fri']:tap(label)
 capture('S1-no-days');assert not find('Continue')['enabled']
 tap('Weekdays');tap('Start time: 9 AM');find('Blocking starts');capture('time-sheet')
 sliders=[n for n in tree() if n.get('type')=='Slider'];f=sliders[-1]['frame']
 run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']/2),round(f['y']+f['height']/2+32));time.sleep(1)
 tap('Done');time.sleep(1);capture('S1-wheel-change')
 # All-day remains a valid schedule whatever time wheel choice was made.
 control('All day');time.sleep(.6);capture('S1-all-day');tap('Continue')
 time.sleep(.45);screenshot(out/'S2.png');find('Your plan is ready');capture('S3')
 for label,heading in [('Edit goal','Set your walking goal'),('Edit place','Where will you walk?'),('Edit schedule','When should blocking be active?')]:
  if label=='Edit schedule':swipe(200,670,200,360);time.sleep(.6)
  tap(label);find(heading);time.sleep(.6)
  if label=='Edit goal':tap('Add 500 steps')
  if label=='Edit place':tap('Either')
  tap('Continue');find('Your plan is ready');time.sleep(.7)
 capture('S3-edited');tap('Use this plan');find('Continue');capture('S3b');tap('Continue');find('We want you to try ExcerLock Premium for free');capture('S3c');tap('Next');find('Try ExcerLock free')
run('xcrun','simctl','ui',SIM,'content_size','accessibility-extra-extra-extra-large')
run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock');open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(3)
for step in ['S1','S3']:
 open_url('excerlock://onboarding/'+step);time.sleep(2);capture(step+'-xl');swipe(200,670,200,320);time.sleep(.6);capture(step+'-xl-scrolled')
run('xcrun','simctl','ui',SIM,'content_size','large')
print('Schedule, wheel, build, edit returns, save, trial transition and XL captured')
