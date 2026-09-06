"""Summarize exported iOS AX controls and focus order; visibility is reviewed in paired images."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'evidence/T14/xl'
report=[]
for path in sorted(root.glob('*.json')):
 nodes=json.loads(path.read_text());controls=[n for n in nodes if n.get('type') in ['Button','CheckBox','Slider','TextField','TextArea']]
 unnamed=[n for n in controls if not (n.get('AXLabel') or '').strip() and n.get('type') not in ['Slider']]
 # Native time-wheel columns expose values; keyboard candidates can have no accessible label.
 unnamed=[n for n in unnamed if not n.get('AXValue') and n.get('frame',{}).get('y',0)<500]
 report.append({'file':path.name,'controls':len(controls),'unnamed':unnamed,'focus':[n.get('AXLabel') for n in nodes if n.get('AXLabel')]})
(root.parent/'native-a11y-audit.json').write_text(json.dumps(report,indent=2))
print('Reviewed trees:',len(report),'suspect unnamed controls:',sum(len(r['unnamed']) for r in report))
