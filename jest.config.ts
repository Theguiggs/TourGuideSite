import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    // Story 4.6 — déduplique React : le DS (@murmure) embarque un react imbriqué
    // (packages/design-system/node_modules/react) ; sans ce mapping, les
    // composants DS à hooks (Button…) lèvent "Invalid hook call" en test.
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '^react/(.*)$': '<rootDir>/node_modules/react/$1',
    '^react-dom/(.*)$': '<rootDir>/node_modules/react-dom/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    // Même arbre que `tsconfig.json` (`@amplify-schema` → ../TourGuideApp).
    // Le mapping pointait vers `../TourGuide/…`, répertoire renommé en avril :
    // ce qui était typé n'était pas ce qui était testé, et le jour où un test
    // aurait résolu le module, la suite serait tombée sur « Cannot find module »
    // sans rapport avec le changement. `alias-parity.test.ts` épingle l'accord.
    '^@amplify-schema$': '<rootDir>/../TourGuideApp/amplify/data/resource',
    '\\.(css)$': '<rootDir>/src/__mocks__/styleMock.ts',
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts", "<rootDir>/src/__mocks__/appsync-client-mock.ts"],
  testMatch: ['**/*.test.{ts,tsx}'],
  modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  watchPathIgnorePatterns: ['<rootDir>/.next/'],
  coverageThreshold: {
    global: {
      branches: 37,
      functions: 63,
      lines: 60,
      statements: 58,
    },
  },
};

export default config;
