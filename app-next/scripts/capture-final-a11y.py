"""Recheck T15 visual corrections at XL and with Reduce Motion."""
from sim import *
from visible_tap import visible_tap as tap
out=ROOT/'evidence/T15'
def go(path):open_url('excerlock://'+path);time.sleep(1.2)
for mode in ['xl','reduced']:
 run('xcrun','simctl','ui',SIM,'content_size','accessibility-large' if mode=='xl' else 'large')
 run('xcrun','simctl','spawn',SIM,'defaults','write','com.apple.Accessibility','ReduceMotionEnabled','-bool','YES' if mode=='reduced' else 'NO')
 run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock');go('expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(3)
 with recording(out/(mode+'-final-fixes.mp4')):
  for scenario,path,name in [('analytics-day-zero','analytics','empty-analytics'),('home-locked-walking','settings/gyms','empty-gyms'),('home-locked-walking','settings','permission-layout')]:
   go('dev?scenario='+scenario);go(path)
   if name=='permission-layout':
    for _ in range(5):
     n=find('Notifications, Granted');f=n['frame']
     if 100<f['y']<620:break
     swipe(200,660,200,260,.5);time.sleep(.6)
   screenshot(out/(mode+'-'+name+'.png'));(out/(mode+'-'+name+'.json')).write_text(json.dumps(tree()))
  go('dev?scenario=onboarding-walking-resume');go('onboarding/S1');tap('Continue');find('Your plan is ready');time.sleep(.8);screenshot(out/(mode+'-schedule-label.png'))
 print('Reviewed corrections',mode,flush=True)
