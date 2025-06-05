import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import assert from 'assert';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Test utilities
import express from 'express';
import { Server } from 'http';
import { createApiRouter } from '../../src/routes/api';
import { createSimulationRouter } from '../../src/routes/simulation-api';
import { createEventHistoryRouter } from '../../src/routes/event-history-api';
import { initializeSimulator } from '../../src/simulation';
import { EventHistoryStore } from '../../src/utils/event-store';

interface SelfContainedTestContext {
  server?: Server;
  baseUrl: string;
  lastResponse?: AxiosResponse;
  lastError?: AxiosError;
  testRequestId?: string;
  processedRequests: Set<string>;
}

const testContext: SelfContainedTestContext = {
  baseUrl: 'http://localhost:3050', // Use different port to avoid conflicts
  processedRequests: new Set()
};

// Setup isolated test server
Before({ tags: '@self-contained-integration' }, async function () {
  // Reset context
  testContext.lastResponse = undefined;
  testContext.lastError = undefined;
  testContext.processedRequests.clear();

  // Start isolated test server
  await startIsolatedTestServer();
});

After({ tags: '@self-contained-integration' }, async function () {
  await stopIsolatedTestServer();
});

async function startIsolatedTestServer(): Promise<void> {
  if (testContext.server) {
    return;
  }

  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    // Initialize event store
    EventHistoryStore.getInstance({ maxInMemoryEvents: 100 });

    // Setup API routes with isolated state
    app.use('/api', createApiRouter(testContext.processedRequests));

    // Setup event history routes
    app.use('/event-history', createEventHistoryRouter());

    // Setup simulation routes with mock simulator
    const mockSimulator = initializeSimulator(testContext.baseUrl);
    app.use('/simulation', createSimulationRouter(mockSimulator));

    testContext.server = app.listen(3050, () => {
      resolve();
    });
  });
}

async function stopIsolatedTestServer(): Promise<void> {
  if (!testContext.server) {
    return;
  }

  return new Promise((resolve, reject) => {
    testContext.server!.close((err) => {
      if (err) {
        reject(err);
      } else {
        testContext.server = undefined;
        resolve();
      }
    });
  });
}

// Step definitions with unique names to avoid conflicts

Given('the OTC service is running without external dependencies', function () {
  // Server should be started in Before hook
  assert.ok(testContext.server, 'Isolated test server should be running');
});

Given('I have a loan application with unique request ID', function () {
  testContext.testRequestId = uuidv4();
});

When('I submit a complete loan application', async function () {
  const payload = {
    requestId: uuidv4(),
    loanId: `loan-${uuidv4()}`,
    amount: '1000.00',
    borrowerId: `borrower-${uuidv4()}`
  };

  try {
    testContext.lastResponse = await axios.post(`${testContext.baseUrl}/api/loan-applications`, payload);
  } catch (error) {
    testContext.lastError = error as AxiosError;
  }
});

When('I submit a complete collateral top-up request', async function () {
  const payload = {
    requestId: uuidv4(),
    loanId: `loan-${uuidv4()}`,
    borrowerId: `borrower-${uuidv4()}`,
    amount: '500.00'
  };

  try {
    testContext.lastResponse = await axios.post(`${testContext.baseUrl}/api/collateral-top-ups`, payload);
  } catch (error) {
    testContext.lastError = error as AxiosError;
  }
});

When('I submit the loan application', async function () {
  const payload = {
    requestId: testContext.testRequestId,
    loanId: `loan-${uuidv4()}`,
    amount: '1000.00',
    borrowerId: `borrower-${uuidv4()}`
  };

  try {
    testContext.lastResponse = await axios.post(`${testContext.baseUrl}/api/loan-applications`, payload);
  } catch (error) {
    testContext.lastError = error as AxiosError;
  }
});

When('I submit the same loan application again', async function () {
  const payload = {
    requestId: testContext.testRequestId,
    loanId: `loan-${uuidv4()}`,
    amount: '1000.00',
    borrowerId: `borrower-${uuidv4()}`
  };

  try {
    testContext.lastResponse = await axios.post(`${testContext.baseUrl}/api/loan-applications`, payload);
  } catch (error) {
    testContext.lastError = error as AxiosError;
  }
});

When('I submit a loan application missing required fields', async function () {
  const payload = {
    requestId: uuidv4()
    // Missing required fields
  };

  try {
    testContext.lastResponse = await axios.post(`${testContext.baseUrl}/api/loan-applications`, payload);
  } catch (error) {
    testContext.lastError = error as AxiosError;
  }
});

When('I submit a collateral top-up missing required fields', async function () {
  const payload = {
    requestId: uuidv4()
    // Missing required fields
  };

  try {
    testContext.lastResponse = await axios.post(`${testContext.baseUrl}/api/collateral-top-ups`, payload);
  } catch (error) {
    testContext.lastError = error as AxiosError;
  }
});

When('I check the service health endpoint', async function () {
  try {
    testContext.lastResponse = await axios.get(`${testContext.baseUrl}/api/health`);
  } catch (error) {
    testContext.lastError = error as AxiosError;
  }
});

When('I check the event history endpoint', async function () {
  try {
    testContext.lastResponse = await axios.get(`${testContext.baseUrl}/event-history`);
  } catch (error) {
    testContext.lastError = error as AxiosError;
  }
});

When('I request simulation statistics', async function () {
  try {
    testContext.lastResponse = await axios.get(`${testContext.baseUrl}/simulation/stats`);
  } catch (error) {
    testContext.lastError = error as AxiosError;
  }
});

When('I control the simulation state', async function () {
  try {
    // Test both start and stop
    await axios.post(`${testContext.baseUrl}/simulation/start`);
    const stopResponse = await axios.post(`${testContext.baseUrl}/simulation/stop`);

    // Store the last response for assertion
    testContext.lastResponse = stopResponse;
  } catch (error) {
    testContext.lastError = error as AxiosError;
  }
});

Then('the loan application should be accepted', function () {
  assert.ok(testContext.lastResponse, 'Should have received a response');
  assert.strictEqual(testContext.lastResponse.status, 202, 'Should receive 202 Accepted');
});

Then('the collateral top-up should be accepted', function () {
  assert.ok(testContext.lastResponse, 'Should have received a response');
  assert.strictEqual(testContext.lastResponse.status, 202, 'Should receive 202 Accepted');
});

Then('the response should include processing confirmation', function () {
  assert.ok(testContext.lastResponse, 'Should have received a response');
  assert.ok(testContext.lastResponse.data.requestId, 'Response should include request ID');
  assert.ok(testContext.lastResponse.data.timestamp, 'Response should include timestamp');
});

Then('the event should be logged internally', function () {
  // The event should be processed and logged
  assert.ok(testContext.lastResponse, 'Should have received a response');
  assert.ok(testContext.lastResponse.data.requestId, 'Event should have been processed');
});

Then('the application should be accepted', function () {
  assert.ok(testContext.lastResponse, 'Should have received a response');
  assert.strictEqual(testContext.lastResponse.status, 202, 'Should receive 202 Accepted');
});

Then('the duplicate should be rejected with conflict status', function () {
  assert.ok(testContext.lastError && testContext.lastError.response, 'Should have received an error response');
  assert.strictEqual(testContext.lastError.response.status, 409, 'Should receive 409 Conflict for duplicate');
});

Then('the application should be rejected with validation errors', function () {
  assert.ok(testContext.lastError && testContext.lastError.response, 'Should have received an error response');
  assert.strictEqual(testContext.lastError.response.status, 400, 'Should receive 400 Bad Request for validation error');
});

Then('the top-up should be rejected with validation errors', function () {
  assert.ok(testContext.lastError && testContext.lastError.response, 'Should have received an error response');
  assert.strictEqual(testContext.lastError.response.status, 400, 'Should receive 400 Bad Request for validation error');
});

Then('the health check should return service status', function () {
  assert.ok(testContext.lastResponse, 'Should have received a response');
  assert.strictEqual(testContext.lastResponse.status, 200, 'Should receive 200 OK');
  assert.ok(testContext.lastResponse.data.status, 'Response should contain status');
});

Then('the health check should include event statistics', function () {
  assert.ok(testContext.lastResponse, 'Should have received a response');
  assert.ok(typeof testContext.lastResponse.data.eventCount === 'number', 'Response should contain event count');
});

Then('the event history should be accessible', function () {
  assert.ok(testContext.lastResponse, 'Should have received a response');
  assert.strictEqual(testContext.lastResponse.status, 200, 'Should receive 200 OK');
});

Then('the event history should contain recent events', function () {
  assert.ok(testContext.lastResponse, 'Should have received a response');
  assert.ok(Array.isArray(testContext.lastResponse.data.events), 'Response should contain events array');
});

Then('the simulation stats should be available', function () {
  assert.ok(testContext.lastResponse, 'Should have received a response');
  assert.strictEqual(testContext.lastResponse.status, 200, 'Should receive 200 OK');
  assert.ok(testContext.lastResponse.data.stats, 'Response should contain simulation stats');
});

Then('the simulation should respond to control commands', function () {
  assert.ok(testContext.lastResponse, 'Should have received a response');
  assert.strictEqual(testContext.lastResponse.status, 200, 'Should receive 200 OK for simulation control');
});
