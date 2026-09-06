"""Calendar periods, unavailable measurements and large-type analytics evidence."""
from sim import *
out=ROOT/'evidence/T11';out.mkdir(exist_ok=True)
def capture(name):
 time.sleep(.8);screenshot(out/f'{name}.png');(out/f'{name}.json').write_text(json.dumps(tree()))
for scenario in ['analytics-6-weeks','analytics-day-zero','analytics-no-measurement']:
 open_url('excerlock://dev?scenario='+scenario);time.sleep(1);open_url('excerlock://analytics');find('This week');time.sleep(.7)
 with recording(out/(scenario+'.mp4')):
  for period in ['Week','Month','Year']:
   tap(period);capture(scenario+'-'+period);swipe(200,650,200,270);time.sleep(.7);capture(scenario+'-'+period+'-charts');swipe(200,300,200,700);time.sleep(.7);swipe(200,300,200,700);time.sleep(.7)
  tap('Week');tap('Previous period');capture(scenario+'-previous-week')
run('xcrun','simctl','ui',SIM,'content_size','accessibility-extra-extra-extra-large');run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock');open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(4);open_url('excerlock://dev?scenario=analytics-6-weeks');time.sleep(1);open_url('excerlock://analytics');time.sleep(1);capture('analytics-xl');swipe(200,660,200,250);time.sleep(.7);capture('analytics-xl-chart');run('xcrun','simctl','ui',SIM,'content_size','large')
print('Analytics three periods, three scenarios and XL captured')
