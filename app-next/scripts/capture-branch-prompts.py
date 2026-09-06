"""Grant and deny Health / When-in-use using fresh fake onboarding answers."""
from sim import *
out=ROOT/'evidence/T08'
def capture(name):
 time.sleep(.7);screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()))
def start(activity):
 open_url('excerlock://dev?scenario=fresh-install');time.sleep(1);open_url('excerlock://onboarding/O20');find('What exercise should unlock your apps?');tap(activity);open_url('excerlock://onboarding/T4');find('How your free trial works');tap('Continue');find('Choose your plan');tap('Start free trial');find('Let ExcerLock block your apps');tap('Skip for now');find('Which apps should wait?');tap('Skip for now')
with recording(out/'setup-health-location-prompts.mp4'):
 for activity,permission,allow,title in [('Running','health','Allow Health access','Let ExcerLock read your workouts?'),('Gym','location','Allow location while using the app','Let ExcerLock use your location?')]:
  for result in ['Don’t allow','Allow']:
   start(activity);find(allow);capture(permission+'-primer');tap(allow);find(title);capture(permission+'-prompt');tap(result);capture(permission+('-denied' if result=='Don’t allow' else '-granted'))
print('Health and When-in-use grant/deny captured')
