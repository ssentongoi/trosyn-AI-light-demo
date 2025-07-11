/// <reference types="cypress" />

describe('Health Check', () => {
  before(() => {
    // Use the custom command to wait for the server to be healthy
    cy.waitForServer();
  });

  it('should return 200 and server status', { retries: 3 }, () => {
    cy.request({
      method: 'GET',
      url: '/health',
      timeout: 10000,
      failOnStatusCode: false
    }).then((response) => {
      // Log response for debugging
      cy.log('Health check response:', response);
      
      // Basic response validation
      expect(response.status).to.eq(200, 'Expected status code to be 200');
      
      // Response body validation
      expect(response.body).to.include({
        status: 'success',
        message: 'Server is running',
        environment: 'test'
      });
      
      // Check timestamp is recent (within 10 seconds)
      const timestamp = new Date(response.body.timestamp).getTime();
      const now = Date.now();
      expect(timestamp).to.be.within(now - 10000, now + 1000, 'Timestamp should be recent');
      
      // Check additional health metrics
      expect(response.body).to.include.keys(['nodeVersion', 'memoryUsage', 'uptime']);
      expect(response.body.uptime).to.be.a('number').and.be.greaterThan(0);
    });
  });

  it('should respond within acceptable time', () => {
    const startTime = Date.now();
    cy.request('/health').then(() => {
      const responseTime = Date.now() - startTime;
      expect(responseTime, 'Response should be fast').to.be.lessThan(500);
    });
  });

  it('should return 404 for unknown routes', () => {
    const nonExistentRoute = `/api/non-existent-${Date.now()}`;
    cy.request({
      method: 'GET',
      url: nonExistentRoute,
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(404);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message');
    });
  });
});
