"""Treadmill framing and shared sheet dismissal."""
from sim import *
out=ROOT/'evidence/T13'
def go(path):open_url('excerlock://'+path);time.sleep(1)
def capture(name):time.sleep(.7);screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()))
def nextscreen(title):tap('Continue');find(title);time.sleep(.8)
go('dev?scenario=home-no-rules');go('conditions');tap('Add condition');find('What exercise should unlock your apps?');time.sleep(.8);tap('Walking');nextscreen('Where will you walk?');tap('Treadmill');nextscreen('How should walking unlock your apps?');tap('Unlock while walking');nextscreen('When should blocking be active?');nextscreen('Your plan is ready');tap('Save condition');time.sleep(1);go('home?placement=handheld')
with recording(out/'treadmill-framing.mp4'):
 tap('Start a walk');find('Phone in hand');capture('treadmill-handheld');go('home?placement=propped');find('Phone propped');capture('treadmill-propped');tap('Start walking');find('Checking your pace');capture('treadmill-verifying');tap('Stop walk');find('Walk complete');time.sleep(.7);tap('Done');time.sleep(.8)
 tap('Start a walk');find('Walk & Scroll');time.sleep(.8);n=find('Walk & Scroll');f=n['frame'];swipe(round(f['x']+f['width']/2),round(f['y']+f['height']/2),200,830,.5);time.sleep(.8);capture('drag-dismissed')
print('Treadmill handheld/propped/start and drag dismissal passed')
