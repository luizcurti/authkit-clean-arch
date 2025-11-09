// Jest setup file
import 'reflect-metadata'

// Mock console methods to avoid noise in tests
const originalConsole = global.console

beforeAll(() => {
  global.console = {
    ...originalConsole,
    // Comment out the next line if you want to see console.logs in tests
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
})

afterAll(() => {
  global.console = originalConsole
})