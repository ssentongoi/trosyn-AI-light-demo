import request from 'supertest';
import { startTestServer, stopTestServer } from '../testUtils';

describe('Health Check Integration', () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    // Start the test server
    const result = await startTestServer(0);
    server = result.server;
    port = result.port;
  });

  afterAll(async () => {
    // Stop the test server
    await stopTestServer();
  });

  it('should return 200 and server status', async () => {
    const response = await request(`http://localhost:${port}`)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('status', 'success');
    expect(response.body).toHaveProperty('message', 'Server is running');
    expect(response.body).toHaveProperty('environment', 'test');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('nodeVersion');
    expect(response.body).toHaveProperty('memoryUsage');
    expect(response.body).toHaveProperty('uptime');
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(`http://localhost:${port}`)
      .get('/non-existent-route')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('status', 'error');
    expect(response.body).toHaveProperty('message');
  });
});
