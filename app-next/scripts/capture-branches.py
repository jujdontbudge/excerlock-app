"""Gym, running and biking branch evidence through the saved-plan summary."""
from sim import *
out=ROOT/'evidence/T05b';out.mkdir(exist_ok=True)
def capture(name):
 time.sleep(.8);screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()))
def enter(label,value):
 n=next(n for n in tree() if n.get('AXLabel')==label and n.get('type')=='TextField');f=n['frame'];run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']-20),round(f['y']+f['height']/2),'--duration','.2');run('idb','ui','key-sequence','--udid',SIM,*([79]*8+[42]*8));
 if value:run('idb','ui','text','--udid',SIM,value)
paths=[('Gym','Spend time at the gym','How long at the gym?','G2','45 minutes'),('Gym','Arrive at the gym','When should blocking be active?','arrival',None),('Running','Run for a set time','Set your running goal','R2','30 minutes'),('Running','Run a set distance','Choose your distance','run-D',None),('Biking','Bike for a set time','Set your biking goal','B2','45 minutes'),('Biking','Bike a set distance','Choose your distance','bike-D',None)]
for activity,choice,title,code,preset in paths:
 open_url('excerlock://dev?scenario=fresh-install');find('Get started',15);time.sleep(.5);open_url('excerlock://onboarding/O20');find('What exercise should unlock your apps?');time.sleep(.7);tap(activity);time.sleep(.5);tap('Continue');find({'Gym':'What counts at the gym?','Running':'What counts as a run?','Biking':'What counts as a bike ride?'}[activity]);time.sleep(.7)
 with recording(out/(code+'-branch.mp4')):
  capture(code+'-mode');tap(choice);tap('Continue');find(title);capture(code)
  if preset:tap(preset);capture(code+'-preset')
  if code=='run-D':
   tap('Unit: mi');capture('distance-units');tap('km');find('Choose 0.5–50 km.');capture('distance-km');tap('Unit: km');tap('mi');enter('Distance','');capture('distance-empty');assert not find('Continue')['enabled'];enter('Distance','3')
  if code!='arrival':tap('Continue');find('When should blocking be active?')
  tap('Continue');find('Your plan is ready');capture(code+'-summary');time.sleep(.6)
run('xcrun','simctl','ui',SIM,'content_size','accessibility-extra-extra-extra-large');run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock');open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(3);open_url('excerlock://onboarding/D');find('Choose your distance');capture('D-xl');swipe(200,665,200,330);time.sleep(.6);capture('D-xl-scrolled');run('xcrun','simctl','ui',SIM,'content_size','large')
print('All six non-walking paths and distance XL captured')
