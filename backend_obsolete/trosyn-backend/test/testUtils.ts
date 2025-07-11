import { Server } from 'http';
import { AddressInfo } from 'net';
import { startServer, server as httpServer } from '../src/server';

let testServer: Server;

export const startTestServer = async (port = 0): Promise<{ server: Server; port: number }> => {
  process.env.PORT = port.toString();
  process.env.NODE_ENV = 'test';
  
  try {
    await startServer();
    const server = httpServer;
    if (!server) {
      throw new Error('Server not initialized');
    }
    const serverAddress = server.address();
    if (!serverAddress || typeof serverAddress === 'string') {
      throw new Error('Unexpected server address format');
    }
    const serverPort = serverAddress.port;
    testServer = server;
    console.log(`Test server started on port ${serverPort}`);
    return { server, port: serverPort };
  } catch (error) {
    console.error('Failed to start test server:', error);
    throw error;
  }
};

export const stopTestServer = async (): Promise<void> => {
  if (testServer) {
    return new Promise<void>((resolve, reject) => {
      testServer.close((err) => {
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

export const waitForServer = async (url: string, timeout = 30000): Promise<boolean> => {
  const startTime = Date.now();
  const checkInterval = 500;
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  throw new Error(`Server not ready after ${timeout}ms`);
};
