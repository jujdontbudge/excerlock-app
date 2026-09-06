"""AX-driven tap that first scrolls content clear of fixed tabs and safe-area chrome."""
from sim import tree,tap,swipe,time

def visible_tap(label):
 time.sleep(.45)
 for _ in range(10):
  nodes=tree();matches=[n for n in nodes if (n.get('AXLabel') or '').replace('\u00a0',' ')==label.replace('\u00a0',' ')]
  matches.sort(key=lambda n:n.get('type')!='Button')
  if matches:
   f=matches[0]['frame'];y=f['y']+f['height']/2
   tabs=any(n.get('AXLabel')=='Home' and n.get('type')=='GenericElement' for n in nodes)
   limit=765 if tabs and label not in ['Home','Conditions','Analytics','Settings'] else 835
   if 65<y<limit:tap(label);return
   if y<65:swipe(200,270,200,700,.5)
   else:swipe(200,670,200,260,.5)
  else:time.sleep(.4)
  time.sleep(.5)
 raise AssertionError('No visible tappable target: '+label)
