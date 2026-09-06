"""Headless setup, picker, denial and email verification evidence."""
from sim import *
out=ROOT/'evidence/T08';out.mkdir(exist_ok=True)
def capture(name):
 time.sleep(1);screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()))
def enter(label,value,clear=0):
 nodes=[n for n in tree() if n.get('AXLabel')==label and n.get('type')=='TextField'];assert nodes,label
 f=nodes[0]['frame'];run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']-20),round(f['y']+f['height']/2),'--duration','0.2')
 if clear:run('idb','ui','key-sequence','--udid',SIM,*([79]*clear+[42]*clear))
 if '@' in value:
  before,after=value.split('@');run('idb','ui','text','--udid',SIM,before);tap('@');run('idb','ui','text','--udid',SIM,after)
 else:run('idb','ui','text','--udid',SIM,value)
def scenario(name,step):
 open_url('excerlock://dev?scenario='+name+'&setup='+step);time.sleep(2)
run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock');open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(3)
open_url('excerlock://dev?scenario=fresh-install');time.sleep(2);open_url('excerlock://onboarding/T4');find('How your free trial works');tap('Continue');find('Choose your plan');tap('Start free trial');find('Let ExcerLock block your apps')
with recording(out/'setup-walking-email.mp4'):
 capture('X1');tap('Allow Screen Time');find('Let ExcerLock manage Screen Time?');capture('screen-time-prompt');tap('Allow');find('Access is on');capture('X1-granted');tap('Continue');find('Which apps should wait?');capture('X2-empty');assert not find('Continue')['enabled']
 tap('Choose apps');find('Choose apps to block');capture('app-picker');tap('Social');enter('Search apps and categories','App A');find('App A');tap('App A');capture('app-picker-selected');tap('Done');find('1 app · 1 category');capture('X2-selected');tap('Continue');find('Let ExcerLock count your steps');capture('X3-walking');tap('Allow Motion & Fitness');find('Let ExcerLock use Motion & Fitness?');capture('motion-prompt');tap('Don’t allow');find('Continue anyway');capture('X3-motion-denied');tap('Continue anyway');find('Save your progress');capture('X4')
 tap('Continue with email');find('Sign in with email');enter('Email address','alex@example.test');capture('email');tap('Send code');find('Check your email');enter('Verification code','000000');tap('Verify code');find('That code did not work. Please try again.');capture('email-wrong-code');swipe(200,475,200,250);time.sleep(.7);tap('Resend code');find('A new code is ready.');capture('email-resend');enter('Verification code','123456',6);tap('Verify code');find("You're all set");capture('X5-skipped-motion');tap('Go to Home');find('/home')
with recording(out/'setup-denied-and-health.mp4'):
 scenario('home-permission-needed','X1');find('Continue anyway');capture('X1-denied');tap('Open Settings');find('You can change this permission in Settings. Your current choice stays as it is for now.');capture('X1-settings-note');tap('Continue anyway');find('Which apps should wait?')
 scenario('home-locked-walking','X3');find('Let ExcerLock count your steps');capture('X3-motion-granted')
 scenario('runner-distance','X3');find('Read your workouts from Apple Health');capture('X3-running')
 scenario('biker-time','X3');find('Read your workouts from Apple Health');capture('X3-biking')
print('Walking setup, app picker, email errors, denied permission, and all non-gym X3 branches captured')
