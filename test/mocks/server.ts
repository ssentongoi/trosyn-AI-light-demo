import { setupServer } from 'msw/node';

// Create a mock server with no handlers by default
// Tests can add their own handlers using server.use()
const server = setupServer();

export { server, setupServer };
