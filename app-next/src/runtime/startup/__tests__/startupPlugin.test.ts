const plugin = require('../../../../modules/excerlock-startup/app.plugin.js')._test as {
  inject(source: string): string;
};

const source = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    return true
  }
}`;

test('startup AppDelegate injection is complete and idempotent', () => {
  const once = plugin.inject(source);
  const twice = plugin.inject(once);
  expect(twice).toBe(once);
  expect(once.match(/startupMarkAppDelegateEntry\(\)/g)).toHaveLength(2); // declaration + call
  expect(once).toContain('RCTContentDidAppearNotification');
  expect(once).toContain('startupMarkFirstReactChildMount()');
  expect(once.indexOf('startupMarkAppDelegateEntry()')).toBeLessThan(once.indexOf('let delegate'));
});
