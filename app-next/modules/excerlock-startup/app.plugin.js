const { withAppDelegate } = require('expo/config-plugins');
const DECLARATIONS = `@_silgen_name("ExcerLockStartupMarkAppDelegateEntry")\nprivate func startupMarkAppDelegateEntry()\n@_silgen_name("ExcerLockStartupMarkFirstReactChildMount")\nprivate func startupMarkFirstReactChildMount()`;
const PROPERTY = '  private var excerlockStartupObserver: NSObjectProtocol?';
const START = '    startupMarkAppDelegateEntry()';
const OBSERVER = `    excerlockStartupObserver = NotificationCenter.default.addObserver(\n      forName: Notification.Name("RCTContentDidAppearNotification"), object: nil, queue: .main\n    ) { [weak self] _ in\n      startupMarkFirstReactChildMount()\n      if let observer = self?.excerlockStartupObserver { NotificationCenter.default.removeObserver(observer) }\n      self?.excerlockStartupObserver = nil\n    }`;
function inject(contents) {
    let s = contents;
    if (!s.includes(DECLARATIONS)) s = s.replace('import ReactAppDependencyProvider\n', `import ReactAppDependencyProvider\n\n${DECLARATIONS}\n`);
    if (!s.includes(PROPERTY)) s = s.replace('class AppDelegate: ExpoAppDelegate {\n', `class AppDelegate: ExpoAppDelegate {\n${PROPERTY}\n`);
    if (!s.includes(START)) s = s.replace('  ) -> Bool {\n', `  ) -> Bool {\n${START}\n${OBSERVER}\n`);
    for (const needle of [DECLARATIONS, PROPERTY, START, OBSERVER]) if (!s.includes(needle)) throw new Error(`Could not inject startup diagnostic: ${needle.split('\n')[0]}`);
    return s;
}
function withExcerlockStartup(config) {
  return withAppDelegate(config, mod => {
    if (mod.modResults.language !== 'swift') throw new Error('Startup diagnostics require a Swift AppDelegate');
    mod.modResults.contents = inject(mod.modResults.contents); return mod;
  });
}
module.exports = withExcerlockStartup;
module.exports._test = { DECLARATIONS, PROPERTY, START, OBSERVER, inject };
