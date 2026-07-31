#include <NitroModules/NitroModules-umbrella.h>
#include <ReactNativeHealthkit/ReactNativeHealthkit-Swift-Cxx-Bridge.hpp>
#import "ReactNativeHealthkit-Swift.h"

extern "C" void ExcerLockSetupHealthKitBackgroundDelivery(void) {
  [[BackgroundDeliveryManager shared] setupBackgroundObservers];
}
