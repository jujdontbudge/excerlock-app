const layers = [
  ['calendar', 'persistence', 'ui'],
  ['conditions', 'telemetry', 'remote-config'],
  ['activity', 'identity', 'subscription', 'app-selection', 'gyms', 'treadmill-scan'],
  ['progress', 'lock', 'enforcement', 'notifications', 'setup', 'diagnostics', 'support', 'preferences'],
  ['reconciler', 'journey', 'onboarding'],
  ['home', 'insights'],
  ['runtime', 'dev-harness'],
];

const pkg = 'src/packages';
const any = (names) => `(${names.join('|')})`;

const layerRules = layers.slice(0, -1).map((layer, index) => ({
  name: `layer-${index + 1}`,
  comment: `${layer.join(', ')} may not import packages from a higher layer (ARCHITECTURE.md rule 3).`,
  severity: 'error',
  from: { path: `^${pkg}/${any(layer)}/` },
  to: { path: `^${pkg}/${any(layers.slice(index + 1).flat())}/` },
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
      name: 'package-private',
      comment: 'A package subfolder is private; import another package only through its root files (rule 1).',
      severity: 'error',
      from: { path: `^${pkg}/([^/]+)/` },
      to: { path: `^${pkg}/([^/]+)/.+/`, pathNot: `^${pkg}/$1/` },
    },
    {
      name: 'outside-into-package-internals',
      comment: 'Routes and legacy code import packages only through their root files (rule 1).',
      severity: 'error',
      from: { pathNot: `^${pkg}/` },
      to: { path: `^${pkg}/[^/]+/.+/` },
    },
    {
      name: 'testing-fakes',
      comment: 'Only runtime and dev-harness may import a package testing.ts demo fake.',
      severity: 'error',
      from: { pathNot: `^${pkg}/(runtime|dev-harness)/` },
      to: { path: `^${pkg}/[^/]+/testing\\.ts$` },
    },
    {
      name: 'native-adapters',
      comment: 'Only runtime wires native adapters and native modules (rule 5).',
      severity: 'error',
      from: { path: '^(src|app)/', pathNot: [`^${pkg}/runtime/`, `^${pkg}/[^/]+/lib/native/`, '^src/runtime/'] },
      to: { path: [`^${pkg}/[^/]+/lib/native/`, '^modules/'] },
    },
    {
      name: 'ui-imports-nothing',
      comment: 'The ui package imports no other package (rule 4).',
      severity: 'error',
      from: { path: `^${pkg}/ui/` },
      to: { path: `^${pkg}/`, pathNot: `^${pkg}/ui/` },
    },
    {
      name: 'routes-use-packages',
      comment: 'A route renders one package screen and imports only package entry points.',
      severity: 'error',
      from: { path: '^app/' },
      to: { path: '^src/', pathNot: `^${pkg}/[^/]+/[^/]+$` },
    },
    {
      name: 'demo-is-dev-only',
      comment: 'Features never import demo fakes; only the runtime chooses them.',
      severity: 'error',
      from: { path: '^src/', pathNot: ['^src/demo/', '^src/runtime/', `^${pkg}/(runtime|dev-harness)/`] },
      to: { path: '^src/demo/' },
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
