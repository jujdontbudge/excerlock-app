"""T14 all product layouts at Accessibility Large and with OS Reduce Motion."""
from sim import *
import sys
mode=sys.argv[1] if len(sys.argv)>1 else 'xl';section=sys.argv[2] if len(sys.argv)>2 else 'intro'
out=ROOT/'evidence/T14'/mode;out.mkdir(parents=True,exist_ok=True)
def go(path,delay=1):open_url('excerlock://'+path);time.sleep(delay)
def capture(name,bottom=True):
 time.sleep(.6);nodes=tree()
 for _ in range(25):
  if len(nodes)>3:break
  time.sleep(.2);nodes=tree()
 assert len(nodes)>3, 'Screen did not finish presenting'
 labels=[(n.get('AXLabel') or '') for n in nodes];assert not any('Render Error' in x or 'Uncaught Error' in x for x in labels),labels
 screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(nodes))
 for n in nodes:
  if n.get('AXLabel') in ['Continue','Get started','Go to Home'] and n.get('type')=='Button':assert n['frame']['height']>=54,n
 if bottom and mode=='xl':
  swipe(200,670,200,240,.5);time.sleep(.6);screenshot(out/f'{name}-scrolled.png');(out/f'{name}-scrolled.json').write_text(json.dumps(tree()));swipe(200,250,200,720,.5);time.sleep(.5)
 print(mode,name,flush=True)
base_tap=tap
def tap(label):
 for _ in range(7):
  nodes=[n for n in tree() if n.get('AXLabel')==label];nodes.sort(key=lambda n:n.get('type')!='Button')
  if nodes:
   f=nodes[0]['frame'];center=f['y']+f['height']/2
   if 65<center<(840 if label in ['Continue','Get started','Go to Home','Use this plan','Done','Save gym'] else 750):base_tap(label);return
   if center<65:swipe(200,260,200,710,.5)
   else:swipe(200,670,200,260,.5)
  else:time.sleep(.4)
  time.sleep(.5)
 base_tap(label)
def nextscreen(title):tap('Continue');find(title);time.sleep(.8)
run('xcrun','simctl','ui',SIM,'content_size','accessibility-large' if mode=='xl' else 'large')
run('xcrun','simctl','spawn',SIM,'defaults','write','com.apple.Accessibility','ReduceMotionEnabled','-bool','YES' if mode=='reduced' else 'NO')
run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock');go('expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091',4)
with recording(out/(section+'.mp4')):
 if section=='intro':
  go('dev?scenario=fresh-install')
  for i in range(1,21):
   step='O'+str(i).zfill(2);go('onboarding/'+step)
   if i==4:
    run('idb','ui','text','--udid',SIM,'Alex');capture(step+'-keyboard',False);tap('Continue');go('onboarding/'+step)
   if i==12:time.sleep(5)
   capture(step)
 elif section=='branches':
  paths=[('Walking','Reach a step goal',['W1','W2','W3']),('Walking','Unlock while walking',['W1','W2']),('Gym','Spend time at the gym',['G1','G2']),('Gym','Arrive at the gym',['G1']),('Running','Run for a set time',['R1','R2']),('Running','Run a set distance',['R1','D']),('Biking','Bike for a set time',['B1','B2']),('Biking','Bike a set distance',['B1','D'])]
  for activity,choice,steps in paths:
   go('dev?scenario=fresh-install');go('onboarding/O20');tap(activity);tap('Continue');time.sleep(.8)
   for j,step in enumerate(steps):
    if step in ['W2','G1','R1','B1']:tap(choice)
    capture(activity+'-'+choice.replace(' ','-')+'-'+step)
    tap('Continue');time.sleep(.8)
   find('When should blocking be active?')
  for step in ['S1','S2','S3','S4','T1','T2','T3','T4']:
   go('onboarding/'+step,.2 if step=='S2' else 1);capture(step,step!='S2')
  go('onboarding/T4');tap('Continue');find('Choose your plan');capture('P')
 elif section=='setup':
  for scenario,step,code in [('home-permission-needed','X1','X1'),('home-no-apps','X2','X2'),('home-locked-walking','X3','X3-walking'),('gym-arrival-user','X3','X3-gym'),('runner-distance','X3','X3-running'),('biker-time','X3','X3-biking'),('signed-in-apple','X4','X4'),('home-locked-walking','X5','X5')]:
   go('dev?scenario='+scenario+'&setup='+step);capture(code)
  go('dev?scenario=home-locked-walking');go('sign-in');capture('sign-in');tap('Continue with email');capture('email')
 elif section=='tabs':
  for scenario in ['home-locked-walking','home-unlocked-met','home-walking-session','home-before-window','home-no-rules','home-permission-needed','home-no-apps','multi-rule-overlap','window-crosses-midnight']:
   go('dev?scenario='+scenario);capture(scenario)
  go('dev?scenario=multi-rule-overlap');go('conditions');capture('conditions');tap('Add condition');capture('builder');tap('Cancel')
  for scenario in ['analytics-6-weeks','analytics-day-zero','analytics-no-measurement']:
   go('dev?scenario='+scenario);go('analytics')
   for period in ['Week','Month','Year']:
    tap(period);capture(scenario+'-'+period)
  go('settings');capture('settings')
  for path in ['account','gyms','support','permission/screenTime','permission/motion','permission/health','permission/location','permission/notifications','permission/camera','legal/privacy','legal/terms']:
   go('settings/'+path);capture(path.replace('/','-'))
  go('dev?stage=shield')
  for cause in ['locked','lockWindow','walkingEnded']:tap(cause);capture('shield-'+cause)
print('Completed',mode,section,flush=True)
