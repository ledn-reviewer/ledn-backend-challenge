/**
 * Jest configuration for the Coruscant Bank OTC Service
 */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: [
    '**/src/**/*.spec.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/test/',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Set up NODE_ENV for tests
  setupFiles: ['<rootDir>/jest.setup.js'],
};
