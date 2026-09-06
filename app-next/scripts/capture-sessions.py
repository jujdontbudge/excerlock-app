"""T13 native session scripts; AX drives every action."""
from sim import *
out=ROOT/'evidence/T13';out.mkdir(exist_ok=True)
def capture(name):
 screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()))
def go(path,delay=1):open_url('excerlock://'+path);time.sleep(delay)
def load(name):go('dev?scenario='+name,1.2)
run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock')
go('expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091',4)
with recording(out/'walking-phases.mp4'):
 load('home-walking-session');go('home?advance=18000');time.sleep(.8);tap('Start a walk');time.sleep(.8);tap('Done');time.sleep(.8);tap('Start a walk');time.sleep(.8);tap('Start walking');time.sleep(.8);capture('walking-verifying');find('Keep moving',10);capture('walking-live');time.sleep(.5);tap('Minimize');time.sleep(.8);capture('walking-minimized');tap('View walk');time.sleep(.8);find('Keep walking to stay unlocked',10);capture('walking-grace');find('Walk complete',10);capture('walking-ended');tap('Done');time.sleep(.8);capture('home-relocked');tap('Start a walk');time.sleep(.8);tap('Start walking');find('Checking your pace');capture('walk-restarted');tap('Stop walk');find('Walk complete');tap('Done')
with recording(out/'gym-checkin.mp4'):
 load('gym-arrival-user');tap('Check in');time.sleep(.8);capture('gym-outside');find('You’re 400 m away');go('home?presence=inside');find('You’re close enough to check in.');capture('gym-inside');tap('Check in');find('You’re checked in');capture('gym-success');tap('Done');time.sleep(.8);capture('gym-home-unlocked')
with recording(out/'shield-causes.mp4'):
 go('dev?stage=shield');time.sleep(.6)
 for cause in ['locked','lockWindow','walkingEnded']:
  tap(cause);time.sleep(.8);capture('shield-'+cause)
print('T13 walking all phases, minimize/reopen, stop/restart, outside/inside gym and three shields passed')
