// Configure test environment
process.env.NODE_ENV = 'test';

// Configure default timeout for all tests
jest.setTimeout(10000);

// Global test setup
beforeAll(async () => {
  // Initialize test database or other global setup
  console.log('Global test setup');
});

afterAll(async () => {
  // Clean up test database or other global teardown
  console.log('Global test teardown');
});

// Global test utilities
global.sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
