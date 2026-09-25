const layers = [
  ['config', 'model'],
  ['analytics', 'db'],
  ['auth', 'identity', 'incidents', 'subscriptions', 'support', 'user-deletion', 'webhooks'],
  ['vendors'],
];

const pkg = 'src/packages';
const any = (names) => `(${names.join('|')})`;

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
      from: { path: '^src/' },
      to: { circular: true },
    },
    {
      name: 'everything-in-packages',
      comment: 'Server source lives in src/packages/<name>/, src/routes/ or the three entry files.',
      severity: 'error',
      from: { path: '^src/', pathNot: [`^${pkg}/`, '^src/routes/', '^src/(index|instrument|migrate)\\.ts$'] },
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
      comment: 'Routes and entry files import packages only through their root files (rule 1).',
      severity: 'error',
      from: { pathNot: `^${pkg}/` },
      to: { path: `^${pkg}/[^/]+/.+/` },
    },
    {
      name: 'packages-below-routes',
      comment: 'Packages never import routes or the entry files.',
      severity: 'error',
      from: { path: `^${pkg}/` },
      to: { path: '^src/', pathNot: `^${pkg}/` },
    },
    {
      name: 'routes-independent',
      comment: 'A route file never imports another route file except through routes/index.ts and routes/*Support helpers.',
      severity: 'error',
      from: { path: '^src/routes/', pathNot: '^src/routes/index\\.ts$' },
      to: { path: '^src/routes/', pathNot: '^src/routes/[^/]*(Support|RouteError|notImplemented)[^/]*\\.ts$' },
    },
    ...layerRules,
    {
      name: 'not-to-unresolvable',
      comment: 'Every import resolves.',
      severity: 'error',
      from: { path: '^src/' },
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['node_modules', '\\.d\\.ts$', '^dist/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js', '.json'],
    },
  },
};
