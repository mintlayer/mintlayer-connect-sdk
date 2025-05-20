// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@mintlayer/wasm-lib$': '<rootDir>/tests/__mocks__/@mintlayer/wasm-lib.ts',
  },
}
