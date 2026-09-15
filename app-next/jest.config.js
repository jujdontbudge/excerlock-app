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
  },
  testPathIgnorePatterns: ['/node_modules/', '/evidence/'],
};
