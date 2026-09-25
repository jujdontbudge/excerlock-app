const layers = [
  ['model', 'persistence', 'platform', 'trace', 'ui', 'updates'],
  ['preferences', 'schedule'],
  ['ports'],
  ['conditions', 'identity', 'telemetry'],
  ['app-selection', 'permissions', 'subscription'],
  ['gyms', 'notifications'],
  ['activity'],
  ['progress'],
  ['lock'],
  ['enforcement', 'insights', 'unlock'],
  ['home', 'support'],
  ['onboarding', 'settings'],
  ['editor', 'launch', 'paywall', 'setup'],
  ['dev-harness'],
  ['runtime'],
  ['research'],
];

const pkg = 'src/packages';
const any = (names) => `(${names.join('|')})`;
const nativeEntry = `^${pkg}/[^/]+/Native[^/]*$`;
const nativeLib = `^${pkg}/[^/]+/lib/native/`;

const layerRules = layers.map((layer, index) => ({
  name: `layer-${index + 1}`,
  comment: `${layer.join(', ')} import only packages from lower layers (ARCHITECTURE.md rule 3).`,
  severity: 'error',
  from: { path: `^${pkg}/${any(layer)}/` },
  to: { path: `^${pkg}/${any(layers.slice(index).flat())}/`, pathNot: `^${pkg}/$1/` },
}));

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'No dependency cycles (ARCHITECTURE.md rule 2).',
      severity: 'error',
      from: { path: '^(src|app)/' },
      to: { circular: true },
    },
    {
      name: 'everything-in-packages',
      comment: 'All app source lives in src/packages/<name>/.',
      severity: 'error',
      from: { path: '^src/', pathNot: `^${pkg}/` },
      to: {},
    },
    {
      name: 'package-private',
      comment: 'A package subfolder is private; import another package only through its root files (rule 1).',
      severity: 'error',
      from: { path: `^${pkg}/([^/]+)/` },
      to: { path: `^${pkg}/[^/]+/.+/`, pathNot: `^${pkg}/$1/` },
    },
    {
      name: 'outside-into-package-internals',
      comment: 'Routes and code outside packages import packages only through their root files (rule 1).',
      severity: 'error',
      from: { pathNot: `^${pkg}/` },
      to: { path: `^${pkg}/[^/]+/.+/` },
    },
    {
      name: 'routes-use-packages',
      comment: 'Routes import package entry points only.',
      severity: 'error',
      from: { path: '^app/' },
      to: { path: '^src/', pathNot: `^${pkg}/[^/]+/[^/]+$` },
    },
    {
      name: 'native-modules',
      comment: 'Only runtime, <package>/lib/native/** and Native* entry files touch app-next/modules (rule 5).',
      severity: 'error',
      from: { path: '^(src|app)/', pathNot: [`^${pkg}/runtime/`, nativeLib, nativeEntry] },
      to: { path: '^modules/', dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'native-entries',
      comment: 'Another package reaches a Native* entry only from runtime, research or another adapter (rule 5).',
      severity: 'error',
      from: { path: `^${pkg}/([^/]+)/`, pathNot: [`^${pkg}/(runtime|research)/`, nativeLib, nativeEntry] },
      to: { path: nativeEntry, pathNot: `^${pkg}/$1/` },
    },
    {
      name: 'routes-no-native',
      comment: 'Routes never import Native* adapters.',
      severity: 'error',
      from: { path: '^app/' },
      to: { path: nativeEntry },
    },
    ...layerRules,
    {
      name: 'not-to-unresolvable',
      comment: 'Every import resolves.',
      severity: 'error',
      from: { path: '^(src|app)/' },
      to: { couldNotResolve: true, pathNot: ['^@linked-trace', '^@excerlock-', '^virtual:'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['node_modules', '\\.d\\.ts$', '/ios/', '/build/', '/dist/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types', 'react-native'],
      extensions: ['.ios.ts', '.ios.tsx', '.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.json'],
      mainFields: ['react-native', 'module', 'main', 'types'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
