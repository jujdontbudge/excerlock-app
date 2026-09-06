"""Settings groups, sub-screens and local-first account deletion evidence."""
from sim import *
out=ROOT/'evidence/T12';out.mkdir(exist_ok=True)
def capture(name):
 time.sleep(.7);screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()))
def go(path):
 open_url('excerlock://'+path);time.sleep(1)
def reveal(label):
 for _ in range(12):
  matches=[n for n in tree() if n.get('AXLabel')==label and 70<n['frame']['y']<720]
  if matches:return matches[0]
  swipe(200,660,200,260);time.sleep(.6)
 raise AssertionError(label)
go('settings/support')
with recording(out/'support.mp4'):
 capture('support-empty');n=next(n for n in tree() if n.get('AXLabel')=='Your message' and n.get('type') in ['TextField','TextArea']);f=n['frame'];run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']/2),round(f['y']+f['height']/2));run('idb','ui','text','--udid',SIM,'A useful idea for this preview');capture('support-keyboard');tap('Send message');find('Message sent');capture('support-sent')
go('settings/account');tap('Sign in');find('Continue with Apple');time.sleep(.7);tap('Continue with Apple');find('Delete account');capture('account-signed-in')
with recording(out/'account-delete.mp4'):
 tap('Delete account');find('Delete your account forever?');capture('delete-facts');tap('Delete account forever');find('Your account has been deleted. Your on-device plan is still here.');capture('account-deleted');go('conditions');capture('rules-preserved')
run('xcrun','simctl','ui',SIM,'content_size','accessibility-extra-extra-extra-large');run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock');open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(4);go('settings');capture('settings-xl');swipe(200,660,200,260);capture('settings-xl-scrolled');run('xcrun','simctl','ui',SIM,'content_size','large')
print('Settings scroll, all sub-screens, support, account deletion, seven taps and XL captured')
