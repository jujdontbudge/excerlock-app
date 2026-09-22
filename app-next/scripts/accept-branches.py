"""T16 complete fresh-to-Home journeys, eight branch choices, native local adapters."""
from sim import *
import sys,os
out=ROOT/os.environ.get('EXCER_EVIDENCE','evidence/T16');out.mkdir(exist_ok=True)
paths={
 'walking-goal':('Walking','Reach a step goal','Walk 5,000 steps'),
 'walking-state':('Walking','Unlock while walking','Unlock while walking'),
 'gym-arrival':('Gym','Arrive at the gym','Arrive at the gym'),
 'gym-time':('Gym','Spend time at the gym','Spend 30 minutes at the gym'),
 'running-time':('Running','Run for a set time','Run 20 minutes'),
 'running-distance':('Running','Run a set distance','Run 2 mi'),
 'biking-time':('Biking','Bike for a set time','Bike 30 minutes'),
 'biking-distance':('Biking','Bike a set distance','Bike 5 mi'),
}
def capture(name):
 time.sleep(.7);screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()))
def wait(title):find(title,15);time.sleep(.75)
def nextscreen(title):tap('Continue');wait(title)
def click(label):
 for _ in range(8):
  ns=[n for n in tree() if n.get('AXLabel')==label];ns.sort(key=lambda n:n.get('type')!='Button')
  if ns:
   f=ns[0]['frame']
   if 80<f['y']+f['height']/2<835:tap(label);return
  swipe(200,670,200,260,.5);time.sleep(.5)
 tap(label)
selected=[sys.argv[1]] if len(sys.argv)>1 else list(paths)
for code in selected:
 activity,choice,expected=paths[code]
 open_url('excerlock://dev?scenario=fresh-install&prompt=grant');wait('Get started')
 with recording(out/(code+'-complete.mp4')):
  for i in range(1,21):
   if i==4:
    fields=[n for n in tree() if n.get('type')=='TextField'];f=fields[0]['frame'];run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']/2),round(f['y']+f['height']/2));run('idb','ui','text','--udid',SIM,'Alex');entered_name=next(n for n in tree() if n.get('type')=='TextField')['AXValue']
   choice0={5:'Friend',6:'25–34',7:'Employed',8:'More exercise',9:'Focus on what matters',20:activity}.get(i)
   if choice0:click(choice0)
   time.sleep(6 if i==12 else 1 if i in [11,13,14,16,17,18] else .4)
   tap('Get started' if i==1 else 'Continue');time.sleep(.75)
  if activity=='Walking':
   wait('Where will you walk?');click('Outside');nextscreen('How should walking unlock your apps?');click(choice);tap('Continue');time.sleep(.8)
   if code=='walking-goal':
    wait('Set your walking goal');capture(code+'-W3')
    if 'EXCER_EVIDENCE' not in os.environ:
     time.sleep(1);run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock');open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');wait('Set your walking goal');capture('W3-cold-resume')
     assert next(n for n in tree() if n.get('AXLabel')=='Daily step goal' and n.get('type')=='TextField').get('AXValue')=='5000 steps'
     tap('Back');wait('How should walking unlock your apps?');assert str(find('Reach a step goal').get('AXValue')).endswith(', checked');capture('W2-resumed-selection')
     tap('Back');wait('Where will you walk?');assert str(find('Outside').get('AXValue')).endswith(', checked');capture('W1-resumed-selection')
     nextscreen('How should walking unlock your apps?');nextscreen('Set your walking goal')
    tap('Continue')
  else:
   wait({'Gym':'What counts at the gym?','Running':'What counts as a run?','Biking':'What counts as a bike ride?'}[activity]);click(choice);tap('Continue');time.sleep(.8)
   if code!='gym-arrival':tap('Continue')
  wait('When should blocking be active?');capture(code+'-schedule');tap('Continue');wait('Your plan is ready');capture(code+'-summary');assert any((n.get('AXLabel') or '').replace('\u00a0',' ')=='Mon–Fri · 9 AM–9 PM' for n in tree());click('Use this plan');wait('Continue');click('Continue');wait('We want you to try ExcerLock Premium for free');click('Next');wait('Try ExcerLock free');nextscreen("We'll remind you before it ends");nextscreen('Want a trial reminder?');click('Enable reminders');wait('How your free trial works');nextscreen('Choose your plan');click('Start free trial');wait('Let ExcerLock block your apps');click('Allow Screen Time');wait('Access is on');nextscreen('Which apps should wait?');click('Choose apps');wait('Choose apps to block');click('Social');click('Done');time.sleep(.9);nextscreen('Find your gym' if activity=='Gym' else 'Let ExcerLock count your steps' if activity=='Walking' else 'Read your workouts from Apple Health')
  if activity=='Gym':
   click('Choose a gym');wait('Choose your gym');click('West Loop Fitness');click('Save gym');time.sleep(.9);click('Allow location while using the app');wait('Access is on')
  else:click('Allow Motion & Fitness' if activity=='Walking' else 'Allow Health access');wait('Access is on')
  nextscreen('Save your progress');click('Skip for now');wait("You're all set");capture(code+'-setup-complete');click('Go to Home');wait('Hi, '+entered_name);find(expected);capture(code+'-home');print('PASS',code,expected,flush=True)
