"""T15 timed press, selection, slider, tab, chart, swipe and sheet micro-interactions."""
from sim import *
out=ROOT/'evidence/T15';out.mkdir(exist_ok=True)
marks=[];start=0
def mark(name):marks.append({'time':round(time.monotonic()-start,3),'event':name})
def go(path):open_url('excerlock://'+path);time.sleep(1)
def press(label,hold=.18):
 find(label,8)
 ns=[n for n in tree() if n.get('AXLabel')==label];ns.sort(key=lambda n:n.get('type')!='Button');f=ns[0]['frame'];mark('press '+label);run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']/2),round(f['y']+f['height']/2),'--duration',hold);time.sleep(.6)
run('xcrun','simctl','ui',SIM,'content_size','large');run('xcrun','simctl','spawn',SIM,'defaults','write','com.apple.Accessibility','ReduceMotionEnabled','-bool','NO');run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock');go('expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(3)
with recording(out/'micro-interactions.mp4'):
 start=time.monotonic();go('dev?scenario=home-locked-walking');mark('Home locked');time.sleep(1);go('home?steps=5000');mark('live unlock');time.sleep(1)
 for label in ['Conditions','Analytics','Settings','Home']:press(label)
 go('dev?component=ChoiceRow');press('Outside');go('dev?component=Slider');nodes=[n for n in tree() if n.get('AXLabel')=='Hours per day' and 'increment' in n.get('custom_actions',[])];f=nodes[0]['frame'];mark('slider drag');swipe(round(f['x']+30),round(f['y']+f['height']/2),round(f['x']+f['width']-20),round(f['y']+f['height']/2),1)
 go('dev?scenario=multi-rule-overlap');go('conditions');nodes=[n for n in tree() if n.get('type')=='CheckBox'];f=nodes[0]['frame'];mark('pause switch');run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']/2),round(f['y']+f['height']/2),'--duration','.2');time.sleep(.7)
 rows=[n for n in tree() if n.get('type')=='Button' and n.get('AXLabel','').startswith(('Walk ','Run ','Spend '))];f=rows[0]['frame'];mark('swipe delete');run('idb','ui','swipe','--udid',SIM,240,round(f['y']+f['height']/2),80,round(f['y']+f['height']/2),'--duration','1','--delta','5');time.sleep(.7);press('Delete');find('Delete condition?');mark('delete sheet');time.sleep(1);press('Keep condition')
 go('analytics');press('Month');press('Year');press('Week');swipe(200,650,200,260,.6);mark('chart revealed');time.sleep(2)
 go('dev?scenario=gym-arrival-user');press('Check in');find('You’re 400 m away');time.sleep(.8);f=find('Close')['frame'];mark('sheet drag');swipe(200,round(f['y']+20),200,830,.7);time.sleep(1)
(out/'micro-interactions-timing.json').write_text(json.dumps(marks,indent=2));print('Micro-interaction sweep complete')
