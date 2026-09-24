"""Final native acceptance gaps: gate, local preferences, five gyms, deletion and overnight."""
from sim import *
from visible_tap import visible_tap as tap
out=ROOT/'evidence/T16';out.mkdir(exist_ok=True)
def go(path):open_url('excerlock://'+path);time.sleep(1.2)
def capture(name):
 time.sleep(.8);screenshot(out/(name+'.png'));(out/(name+'.json')).write_text(json.dumps(tree()));print('PASS',name,flush=True)
def label_start(prefix):return next(n['AXLabel'] for n in tree() if n.get('AXLabel','').startswith(prefix))
with recording(out/'edge-acceptance.mp4'):
 go('dev?scenario=trial-expired&restore=notFound');find('Choose your plan');go('home');find('Choose your plan');assert not any(n.get('AXLabel')=='Home' for n in tree());capture('hard-paywall-blocks-deep-link')
 tap('Restore purchases');find('No active purchase was found.');capture('restore-not-found')
 go('dev?scenario=billing-issue&outcome=error');tap('Start for free');find('Something went wrong. Please try again.');capture('billing-error')
 go('dev?scenario=trial-expired&restore=restored');tap('Restore purchases');find('Hi, Alex');capture('restore-home')
 go('dev?scenario=window-crosses-midnight');find('Apps are blocked');capture('overnight-0100-locked')
 go('dev?scenario=runner-distance');go('settings');tap('Manage subscription');find('This preview keeps you in ExcerLock. Subscription management will open your App Store account in the connected app.');capture('manage-local-feedback')
 tap('Restore purchases');find('Purchases restored');tap('km');go('home');find('Run 2 km');capture('units-propagate')
 go('settings');tap('Walk & Scroll stop grace, 30 seconds');tap('2 minutes');time.sleep(.9);capture('grace-changed')
 for title in ['Touch feedback','Gym auto-detect']:
  for _ in range(10):
   ns=[n for n in tree() if n.get('AXLabel')==title and n.get('type')=='CheckBox']
   if ns and 100<ns[0]['frame']['y']<710:break
   swipe(200,660,200,260,.5);time.sleep(1)
  time.sleep(.5);ns=[n for n in tree() if n.get('AXLabel')==title and n.get('type')=='CheckBox'];before=ns[0]['AXValue'];f=ns[0]['frame'];run('idb','ui','tap','--udid',SIM,round(f['x']+.75*f['width']),round(f['y']+f['height']/2),'--duration','.2');time.sleep(.7)
  if title=='Touch feedback':assert next(n for n in tree() if n.get('AXLabel')==title and n.get('type')=='CheckBox')['AXValue']!=before
  if title=='Gym auto-detect':find('Allow location access all the time?');tap('Don’t allow');time.sleep(.9)
 capture('preference-switches')
 tap('Share ExcerLock');tap('Copy invitation');find('Invitation copied in this preview.');capture('share-local');tap('Close');time.sleep(.9);tap('Rate ExcerLock');find('Thanks for taking a moment for ExcerLock.');capture('rate-near-row')
 go('dev?scenario=home-locked-walking');go('settings/gyms')
 for name in ['West Loop Fitness','River North Gym','Lakeview Strength','South Loop Training','Logan Square Fitness']:
  tap('Add gym');find('Choose your gym');tap(name);tap('Save gym');time.sleep(1);find(label_start(name+', '));capture('gym-count-'+str(['West Loop Fitness','River North Gym','Lakeview Strength','South Loop Training','Logan Square Fitness'].index(name)+1))
 assert not find('Add gym')['enabled'];capture('five-gym-limit')
 go('dev?scenario=multi-rule-overlap');go('conditions');capture('overlap-list')
 for _ in range(5):
  rows=[n for n in tree() if n.get('type')=='Button' and 'Delete' in n.get('custom_actions',[])]
  if not rows:break
  f=rows[0]['frame'];run('idb','ui','swipe','--udid',SIM,240,round(f['y']+f['height']/2),80,round(f['y']+f['height']/2),'--duration','.4','--delta','10');time.sleep(.7);tap('Delete');find('Delete condition?');tap('Delete condition');time.sleep(1)
 find('Your first condition starts here');capture('delete-to-empty')
print('Edge acceptance complete',flush=True)
