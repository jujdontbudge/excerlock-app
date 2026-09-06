"""Replay proven AX journeys against final UI, one normal-speed recording per flow."""
from sim import *
import sys,re
out=ROOT/'evidence/T15';out.mkdir(exist_ok=True)
flow=sys.argv[1]
flows={'home':['capture-home.py'],'conditions':['capture-conditions.py'],'analytics':['capture-analytics.py'],'settings':['capture-settings.py'],'setup':['capture-setup.py','capture-gym-setup.py'],'sheets-and-paywall':['capture-trial.py','capture-sessions.py','capture-treadmill.py']}
run('xcrun','simctl','ui',SIM,'content_size','large')
run('xcrun','simctl','spawn',SIM,'defaults','write','com.apple.Accessibility','ReduceMotionEnabled','-bool','NO')
run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock');open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(4)
marks=[];start=time.monotonic()
with recording(out/(flow+'.mp4')):
 for script in flows[flow]:
  code=(ROOT/'scripts'/script).read_text()
  code=code.split("run('xcrun','simctl','ui',SIM,'content_size','accessibility-extra-extra-extra-large')")[0]
  code=re.sub(r"out=ROOT/'evidence/T\d+'", "out=ROOT/'evidence/T15'",code)
  code=re.sub(r'with recording\([^\n]+\):', 'if True:',code)
  code=code.replace("tap('Dismiss sheet')","tap('Close')")
  code=code.replace("find('/home')","find('Hi, Alex')").replace("find('X1')","find('Let ExcerLock block your apps')")
  # Original capture was written against a placeholder Home; fresh email uses its native lowercase name.
  if script=='capture-setup.py':code=code.replace("find('Hi, Alex')", "find('Home')")
  # Let mounted transitions finish before hitting a just-presented control.
  code=code.replace('def capture(name):', 'def capture(name):\n print(round(time.monotonic()-_recording_start,2),name,flush=True)')
  code=code.replace('from sim import *', 'from sim import *\nfrom visible_tap import visible_tap as tap')
  marks.append({'time':round(time.monotonic()-start,2),'script':script})
  exec(compile(code,script,'exec'),{'__name__':'__main__','_recording_start':start})
(out/(flow+'-timing.json')).write_text(json.dumps(marks,indent=2))
print('Recorded',flow,flush=True)
