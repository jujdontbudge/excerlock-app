"""Grant/deny native fake prompts and no-apps skip; no real OS permissions requested."""
from sim import *
from visible_tap import visible_tap as tap
out=ROOT/'evidence/T16'
def go(path):open_url('excerlock://'+path);time.sleep(1.2)
def capture(name):time.sleep(.7);screenshot(out/(name+'.png'));(out/(name+'.json')).write_text(json.dumps(tree()));print('PASS',name,flush=True)
def start(activity):
 go('dev?scenario=fresh-install');go('onboarding/O20');tap(activity);go('onboarding/T4');tap('Continue');find('Choose your plan');tap('Start for free');find('Let ExcerLock block your apps')
with recording(out/'permission-choices.mp4'):
 for activity,kind,label,prompt in [('Walking','screenTime','Allow Screen Time','Let ExcerLock manage Screen Time?'),('Walking','motion','Allow Motion & Fitness','Let ExcerLock use Motion & Fitness?'),('Running','health','Allow Health access','Let ExcerLock read your workouts?'),('Gym','location','Allow location while using the app','Let ExcerLock use your location?')]:
  for choice in ['Don’t allow','Allow']:
   start(activity)
   if kind!='screenTime':tap('Skip for now');find('Which apps should wait?');tap('Skip for now')
   find(label);tap(label);find(prompt);capture(kind+'-prompt');tap(choice);capture(kind+('-denied' if choice=='Don’t allow' else '-granted'))
 for choice in ['Don’t allow','Allow']:
  go('dev?scenario=fresh-install');go('onboarding/T3');tap('Enable reminders');find('Allow ExcerLock to send notifications?');tap(choice);find('How your free trial works');capture('notifications'+('-denied' if choice=='Don’t allow' else '-granted'))
 go('dev?scenario=home-no-apps&setup=X2');find('Which apps should wait?');assert not find('Continue')['enabled'];tap('Skip for now');find('Let ExcerLock count your steps');capture('no-apps-skip')
 go('dev?scenario=home-locked-walking');go('dev');tap('Camera, granted');go('settings/permission/camera');find('Off');capture('camera-denied-detail')
print('Permission choices complete',flush=True)
