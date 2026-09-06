const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  { ignores: ['ios/**', 'build/**', 'evidence/**', 'coverage/**', 'dist/**'] },
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/design-system/**/*.{ts,tsx}'],
    ignores: ['**/tokens.ts', '**/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message: 'Use a design token instead of a literal color.',
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.{ts,tsx}', 'src/onboarding/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['react', 'react-native', 'react-native-*'] }],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['**/demo/**'] }] },
  },
]);
