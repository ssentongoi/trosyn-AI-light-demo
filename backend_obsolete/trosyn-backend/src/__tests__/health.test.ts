import request from 'supertest';
import { app } from '../server';

describe('Health Check', () => {
  it('should return 200 and server status', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('status', 'success');
    expect(response.body).toHaveProperty('message', 'Server is running');
    expect(response.body).toHaveProperty('environment', 'test');
    expect(response.body).toHaveProperty('timestamp');
    expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/non-existent-route')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('status', 'error');
    expect(response.body).toHaveProperty('message');
  });
});
