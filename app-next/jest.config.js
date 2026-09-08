process.env.TZ = 'America/New_York';
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  // modules/ carries the two local Expo modules' suites; they moved with the
  // native engine and must keep running from app-next.
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.test.tsx',
    '<rootDir>/modules/**/*.test.ts',
    '<rootDir>/modules/**/*.test.tsx',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/__tests__/**', '!src/**/__previews__/**', '!src/domain/types.ts'],
  coverageThreshold: { './src/domain/': { branches: 100 } },
  testPathIgnorePatterns: ['/node_modules/', '/evidence/'],
};
