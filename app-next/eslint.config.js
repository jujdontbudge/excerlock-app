const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  {
    files: ['src/**/*.tsx'],
    plugins: { a11y: require('./eslint-a11y.cjs') },
    rules: { 'a11y/named-controls': 'error' },
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,cjs,mjs}'],
    plugins: { excerlock: require('../packages/eslint-plugin-excerlock/index.cjs') },
    rules: { 'excerlock/no-comments': 'error' },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    ignores: ['src/packages/dev-harness/**', 'src/packages/research/**', 'src/packages/ui/Notice.tsx'],
    plugins: { excerlock: require('../packages/eslint-plugin-excerlock/index.cjs') },
    rules: { 'excerlock/no-status-text': 'error' },
  },
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/packages/ui/Label.tsx'],
    plugins: { excerlock: require('../packages/eslint-plugin-excerlock/index.cjs') },
    rules: { 'excerlock/no-text-nudge': 'error', 'excerlock/no-raw-input-type': 'error' },
  },
  { ignores: ['ios/**', 'build/**', 'evidence/**', 'coverage/**', 'dist/**'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.type="Identifier"][callee.name=/^(?!use|create|stop)[a-z][A-Za-z]*Store$/]',
          message:
            'Alias bound Zustand stores to useXStore when calling them as hooks so React Compiler preserves hook order.',
        },
      ],
    },
  },
  {
    files: ['src/packages/**/*.{ts,tsx}'],
    ignores: ['src/packages/ui/tokens.ts', 'src/packages/ui/illustrationTokens.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.type="Identifier"][callee.name=/^(?!use|create|stop)[a-z][A-Za-z]*Store$/]',
          message: 'Call bound stores through use-prefixed hook names.',
        },
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message: 'Use a design token instead of a literal color.',
        },
      ],
    },
  },
  {
    files: [
      'src/packages/model/**',
      'src/packages/schedule/{calendar,schedule,scheduleLabel,scheduleRepresentability,scheduleWindowPlan}.ts',
      'src/packages/activity/{gymMachine,presence,proppedMachine,walkingMachine}.ts',
      'src/packages/conditions/{ruleName,stepGoal,validateRule}.ts',
      'src/packages/progress/{progress,projectInstanceProgress,projectMeasuredHistory,reclaimed,sealDay,streak}.ts',
      'src/packages/progress/lib/{progressDay,projectGymHistory}.ts',
      'src/packages/lock/resolveLock.ts',
      'src/packages/lock/lib/unlockHint.ts',
      'src/packages/onboarding/flowOrder.ts',
      'src/packages/onboarding/lib/{flow,stepId,validation}.ts',
      'src/packages/enforcement/lib/shieldContent.ts',
      'src/packages/launch/lib/bootDestination.ts',
      'src/packages/notifications/notificationPlan.ts',
      'src/packages/permissions/setupNeeds.ts',
      'src/packages/ports/watchdog.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['react', 'react-native', 'react-native-*'] }],
    },
  },
]);
