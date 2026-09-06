process.env.TZ = 'America/New_York';
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/__tests__/**', '!src/**/__previews__/**', '!src/domain/types.ts'],
  coverageThreshold: { './src/domain/': { branches: 100 } },
  testPathIgnorePatterns: ['/node_modules/', '/evidence/'],
};
