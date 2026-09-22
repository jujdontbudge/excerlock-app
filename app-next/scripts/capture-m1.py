"""A continuous fresh-install walking journey through the first Home unlock."""
from sim import *
out=ROOT/'evidence/T09'
choices={5:'Friend',6:'25–34',7:'Employed',8:'More exercise',9:'Focus on what matters',20:'Walking'}
open_url('excerlock://dev?scenario=fresh-install');time.sleep(2)
with recording(out/'m1-end-to-end.mp4'):
 for i in range(1,21):
  if i==4:
   fields=[n for n in tree() if n.get('type')=='TextField'];f=fields[0]['frame'];run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']/2),round(f['y']+f['height']/2),'--duration','.2');run('idb','ui','text','--udid',SIM,'Alex')
  if i in choices:tap(choices[i])
  time.sleep(6 if i==12 else 1.5 if i in [11,13,14,16,17,18] else .6)
  tap('Get started' if i==1 else 'Continue');time.sleep(.6)
 find('Where will you walk?');tap('Outside');tap('Continue');time.sleep(.7);tap('Continue');find('Set your walking goal');tap('Continue');find('When should blocking be active?');tap('Continue');find('Your plan is ready');time.sleep(.8);tap('Use this plan');find('Continue');tap('Continue');find('We want you to try ExcerLock Premium for free');tap('Next');find('Try ExcerLock free');tap('Continue');find("We'll remind you before it ends");tap('Continue');find('Want a trial reminder?');tap('Enable reminders');find('Allow ExcerLock to send notifications?');tap('Allow');find('How your free trial works');tap('Continue');find('Choose your plan');tap('Start free trial');find('Let ExcerLock block your apps');tap('Allow Screen Time');find('Let ExcerLock manage Screen Time?');tap('Allow');find('Access is on');tap('Continue');find('Which apps should wait?');tap('Choose apps');find('Choose apps to block');tap('Social');tap('Done');find('0 apps · 1 category');tap('Continue');find('Let ExcerLock count your steps');tap('Allow Motion & Fitness');find('Let ExcerLock use Motion & Fitness?');tap('Allow');find('Access is on');tap('Continue');find('Save your progress');tap('Skip for now');find("You're all set");tap('Go to Home');find('Apps are blocked');time.sleep(2);screenshot(out/'m1-home-locked.png');open_url('excerlock://home?steps=5000');find('Unlocked for the rest of today');time.sleep(2);screenshot(out/'m1-home-unlocked.png')
print('Fresh walking onboarding to Home and live unlock passed')
