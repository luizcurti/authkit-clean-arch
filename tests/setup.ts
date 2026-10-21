import 'reflect-metadata'

// Silences console output during tests
const originalConsole = global.console

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
})

afterAll(() => {
  global.console = originalConsole
})
