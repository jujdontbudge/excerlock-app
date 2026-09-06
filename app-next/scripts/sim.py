"""Headless accessibility-driven simulator helpers. One explicitly owned device."""
import contextlib, json, signal, subprocess, time
from pathlib import Path
SIM = 'B68873CD-B6ED-4961-85AF-0C807E657999'
ROOT = Path(__file__).resolve().parents[1]
def run(*args):
 return subprocess.run([str(a) for a in args], check=True, capture_output=True, text=True).stdout
def tree(): return json.loads(run('idb','ui','describe-all','--udid',SIM))
def find(label, timeout=8):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  matches=[item for item in tree() if item.get('AXLabel')==label]
  if matches:return matches[0]
  time.sleep(.15)
 raise AssertionError(f'Missing accessible element: {label}')
def tap(label):
 frame=find(label)['frame']; run('idb','ui','tap','--udid',SIM,round(frame['x']+frame['width']/2),round(frame['y']+frame['height']/2))
def swipe(x,y,end_x,end_y,duration=.8): run('idb','ui','swipe','--udid',SIM,x,y,end_x,end_y,'--duration',duration)
def open_url(url): run('xcrun','simctl','openurl',SIM,url)
def screenshot(path): run('xcrun','simctl','io',SIM,'screenshot',str(Path(path).resolve()))
@contextlib.contextmanager
def recording(path):
 path=Path(path).resolve();path.parent.mkdir(parents=True,exist_ok=True);path.unlink(missing_ok=True)
 process=subprocess.Popen(['xcrun','simctl','io',SIM,'recordVideo','--codec=h264',str(path)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  time.sleep(.4);yield
 finally:
  process.send_signal(signal.SIGINT);process.wait(timeout=10)
