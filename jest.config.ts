import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@amplify-schema$': '<rootDir>/../TourGuide/amplify/data/resource',
    '\\.(css)$': '<rootDir>/src/__mocks__/styleMock.ts',
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts", "<rootDir>/src/__mocks__/appsync-client-mock.ts"],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
};

export default config;
