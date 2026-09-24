"""Record fake trial, permission, purchase and re-entry states without store or OS calls."""
from sim import *
out=ROOT/'evidence/T07';out.mkdir(exist_ok=True)
def capture(name):
 time.sleep(1);screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()))
def scenario(name,extra=''):
 open_url('excerlock://dev?scenario='+name+extra);time.sleep(2)
run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock');open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(3)
scenario('fresh-install');open_url('excerlock://onboarding/S3d');find('No payment due now')
with recording(out/'trial-and-purchase.mp4'):
 capture('S3d');tap('Continue');find('Allow ExcerLock to send notifications?');capture('notification-prompt');tap('Allow')
 find('Choose your plan');capture('P')
 tap('Monthly · $9.99 / month');time.sleep(.4);tap('Annual · $49.99 / year');tap('Start for free');time.sleep(.25);screenshot(out/'P-purchasing.png');find('X1');capture('X1-destination')
with recording(out/'paywall-reentry.mp4'):
 scenario('trial-expired','&restore=notFound');find('Choose your plan');capture('P-expired');tap('Restore purchases');find('No active purchase was found.');capture('P-not-found')
 scenario('billing-issue','&outcome=error');find('Choose your plan');capture('P-billing');tap('Start for free');find('Something went wrong. Please try again.');capture('P-error')
 scenario('trial-expired','&restore=restored');find('Choose your plan');tap('Restore purchases');find('/home');capture('restored-home-destination')
print('Trial, fake prompt, purchase, re-entry errors and restore captured')
