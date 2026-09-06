"""A search query must not move the gym picker's heading and controls."""
import os
from sim import *
from visible_tap import visible_tap as tap
out=ROOT/'evidence/T16';phase=os.environ.get('EXCER_PICKER_PHASE','green')
with recording(out/('picker-stability-'+phase+'.mp4')):
 if any(n.get('AXLabel')=='Dismiss sheet' for n in tree()):tap('Close');time.sleep(1)
 open_url('excerlock://dev?scenario=home-locked-walking');time.sleep(1.5);open_url('excerlock://settings/gyms');time.sleep(1.5);tap('Add gym');find('Choose your gym');time.sleep(1)
 f=next(n for n in tree() if n.get('AXLabel')=='Search for a gym' and n.get('type')=='TextField')['frame'];run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']/2),round(f['y']+f['height']/2));time.sleep(1)
 before=find('Choose your gym')['frame']['y'];screenshot(out/('picker-'+phase+'-before.png'));run('idb','ui','text','--udid',SIM,'River');time.sleep(1)
 after=find('Choose your gym')['frame']['y'];screenshot(out/('picker-'+phase+'-after.png'))
 assert any(n.get('AXLabel')=='River North Gym' for n in tree());assert not any(n.get('AXLabel')=='West Loop Fitness' for n in tree())
 print('Heading y before/after query:',before,after,flush=True);assert abs(after-before)<2,'Search filtering moved the picker controls'
 tap('Close');print('PASS stable picker search and dismissal',flush=True)
