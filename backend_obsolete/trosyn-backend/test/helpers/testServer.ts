import { startServer } from '../../src/server';

let server: any;

export const startTestServer = async (port = 3001) => {
  process.env.PORT = port.toString();
  process.env.NODE_ENV = 'test';
  
  try {
    server = await startServer();
    console.log(`Test server started on port ${port}`);
    return server;
  } catch (error) {
    console.error('Failed to start test server:', error);
    throw error;
  }
};

export const stopTestServer = async () => {
  if (server) {
    return new Promise<void>((resolve, reject) => {
      server.close((err: Error) => {
        if (err) {
          console.error('Error closing test server:', err);
          reject(err);
        } else {
          console.log('Test server stopped');
          resolve();
        }
      });
    });
  }
  return Promise.resolve();
};

// Handle process termination
process.on('SIGTERM', async () => {
  await stopTestServer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await stopTestServer();
  process.exit(0);
});
