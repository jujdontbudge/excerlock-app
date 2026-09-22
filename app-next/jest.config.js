process.env.TZ = 'America/New_York';
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/__tests__/**', '!src/**/__previews__/**', '!src/domain/types.ts'],
  coverageThreshold: { './src/domain/': { branches: 100 } },
  moduleNameMapper: {
    '^@client-services$': '<rootDir>/src/runtime/createClientServices.ts',
    '^@linked-trace$': '<rootDir>/src/research/linkedTrace/LinkedTrace.disabled.ts',
    '^@linked-trace-screen$': '<rootDir>/src/research/linkedTrace/LinkedTraceScreen.disabled.tsx',
    '^@posthog-runtime$': '<rootDir>/src/runtime/analytics/createPostHogRuntime.ts',
    '^@sentry-binding$': '<rootDir>/src/runtime/observability/SentryBinding.ts',
    '^@sentry-capture$': '<rootDir>/src/runtime/observability/SentryCapture.ts',
    // Config plugins run in Node; jest-expo's conditions would otherwise pick uuid 11's ESM browser build.
    '^uuid$': require.resolve('uuid'),
  },
  testPathIgnorePatterns: ['/node_modules/', '/evidence/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|decode-uri-component))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
