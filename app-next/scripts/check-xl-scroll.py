import sys,time
from sim import *
run('xcrun','simctl','ui',SIM,'content_size','accessibility-large')
run('xcrun','simctl','terminate',SIM,'com.johansardar.excerlock')
open_url('excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091');time.sleep(3)
open_url('excerlock://onboarding/O10');time.sleep(1)
swipe(200,650,200,280);time.sleep(.5)
f=find('Hours scrolling per day')['frame'];footer=find('Continue')['frame'];print(f,footer)
assert f['y']+f['height']<=footer['y'],'XL slider cannot scroll above the footer'
