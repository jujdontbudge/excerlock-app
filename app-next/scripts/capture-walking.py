"""Capture the target path, state skip, and large-text goal on our one headless simulator."""
from sim import *
out=ROOT/'evidence/T05';out.mkdir(exist_ok=True)
run('xcrun','simctl','ui',SIM,'content_size','large')
open_url('excerlock://onboarding/W1');time.sleep(2)
with recording(out/'walking-target.mp4'):
 for step,title in [('W1','Where will you walk?'),('W2','How should walking unlock your apps?'),('W3','Set your walking goal')]:
  find(title)
  if step=='W1':tap('Outside')
  if step=='W2':tap('Reach a step goal')
  if step=='W3':tap('Add 500 steps');time.sleep(.6);tap('Remove 500 steps')
  time.sleep(1)
  screenshot(out/f'{step}.png');(out/f'{step}.json').write_text(json.dumps(tree()))
  tap('Continue');time.sleep(.6)
 find('S1')
open_url('excerlock://onboarding/W2');time.sleep(1)
with recording(out/'walking-state-skip.mp4'):
 tap('Unlock while walking');time.sleep(1);screenshot(out/'W2-state.png');tap('Continue');time.sleep(1);find('S1')
open_url('excerlock://onboarding/W2');time.sleep(.8);tap('Reach a step goal')
run('xcrun','simctl','ui',SIM,'content_size','accessibility-extra-extra-extra-extra-large')
run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock')
open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(3)
open_url('excerlock://onboarding/W3');time.sleep(1)
screenshot(out/'W3-xl.png');swipe(200,660,200,340);time.sleep(.6)
screenshot(out/'W3-xl-scrolled.png');(out/'W3-xl-scrolled.json').write_text(json.dumps(tree()))
run('xcrun','simctl','ui',SIM,'content_size','large')
print('Target path, state skip, and XL capture complete')
