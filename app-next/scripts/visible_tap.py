"""AX-driven tap that first scrolls content clear of fixed tabs and safe-area chrome."""
from sim import tree,swipe,time,run,SIM

def visible_tap(label):
 time.sleep(.45)
 for _ in range(10):
  nodes=tree();matches=[n for n in nodes if (n.get('AXLabel') or '').replace('\u00a0',' ')==label.replace('\u00a0',' ')]
  matches.sort(key=lambda n:n.get('type')!='Button')
  if matches:
   f=matches[0]['frame'];y=f['y']+f['height']/2
   tabs=any(n.get('AXLabel')=='Home' and n.get('type')=='GenericElement' for n in nodes)
   limit=765 if tabs and label not in ['Home','Conditions','Analytics','Settings'] else 835
   footers=[n for n in nodes if n.get('type')=='Button' and n['frame']['y']>760 and n['frame']['width']>200 and n.get('AXLabel')!=label]
   if any(n.get('AXLabel')=='Dismiss sheet' for n in nodes) and footers:limit=min(limit,min(n['frame']['y'] for n in footers)-12)
   if 65<y<limit:
    time.sleep(.2)
    stable=[n for n in tree() if (n.get('AXLabel') or '').replace('\u00a0',' ')==label.replace('\u00a0',' ')]
    stable.sort(key=lambda n:n.get('type')!='Button')
    if not stable or abs(stable[0]['frame']['y']-f['y'])>2:continue
    run('idb','ui','tap','--udid',SIM,round(f['x']+f['width']/2),round(y),'--duration','.2');return
   if y<65:swipe(200,270,200,700,.5)
   else:swipe(200,670,200,260,.5)
  else:time.sleep(.4)
  time.sleep(1)
 raise AssertionError('No visible tappable target: '+label)
