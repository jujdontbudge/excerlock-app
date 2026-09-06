"""Conditions list, native swipe, builder and edit evidence."""
from sim import *
out=ROOT/'evidence/T10';out.mkdir(exist_ok=True)
def capture(name):
 time.sleep(.7);screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()))
open_url('excerlock://dev?scenario=multi-rule-overlap');time.sleep(1.5);open_url('excerlock://conditions');find('Conditions');time.sleep(1)
with recording(out/'conditions-builder.mp4'):
 capture('multi-rule-list')
 switches=[n for n in tree() if n.get('type')=='CheckBox'];n=switches[0];f=n['frame'];run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']/2),round(f['y']+f['height']/2),'--duration','.2');capture('paused-rule')
 buttons=[n for n in tree() if n.get('type')=='Button' and n.get('AXLabel','').startswith(('Walk ','Run ','Spend '))];n=buttons[0];f=n['frame'];run('idb','ui','swipe','--udid',SIM,240,round(f['y']+f['height']/2),80,round(f['y']+f['height']/2),'--duration','1','--delta','5');capture('swipe-delete');tap('Delete');find('Delete condition?');capture('delete-confirm');tap('Keep condition');time.sleep(.8)
 swipe(200,650,200,300);time.sleep(.8);tap('Add condition');find('What exercise should unlock your apps?');time.sleep(.8);tap('Biking');tap('Continue');find('What counts as a bike ride?');time.sleep(.7);tap('Bike a set distance');tap('Continue');find('Choose your distance');capture('builder-distance');tap('Continue');find('When should blocking be active?');time.sleep(.7);tap('Continue');find('Your plan is ready');capture('builder-summary');tap('Save condition');find('Conditions');time.sleep(1);capture('created')
 tap('Bike 5 mi');find('Your plan is ready');time.sleep(.7);tap('Edit goal');find('Choose your distance');time.sleep(.7);tap('Unit: mi');tap('km');tap('Continue');find('Your plan is ready');capture('edited-summary');tap('Cancel');find('Discard changes?');capture('dirty-cancel');tap('Keep editing');time.sleep(.8);tap('Save condition');find('Conditions');capture('edited-list')
run('xcrun','simctl','ui',SIM,'content_size','accessibility-extra-extra-extra-large');run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock');open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(3);open_url('excerlock://conditions');find('Conditions');capture('list-xl');swipe(200,660,200,290);capture('list-xl-scrolled');run('xcrun','simctl','ui',SIM,'content_size','large')
print('Conditions list, swipe, create, edit and XL passed')
