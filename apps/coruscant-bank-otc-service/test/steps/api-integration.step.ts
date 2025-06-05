import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import assert from 'assert';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { startLocalServer, stopLocalServer } from '../../src/test-utils/local-server';

// Mock liquidation service
import express from 'express';
import { Server } from 'http';

interface TestContext {
  apiBaseUrl: string;
  mockLiqServiceUrl: string;
  mockLiqServer?: Server;
  requestPayload?: any;
  response?: AxiosResponse;
  error?: AxiosError;
  requestId?: string;
  submittedEvents: any[];
}

const testContext: TestContext = {
  apiBaseUrl: 'http://localhost:3000',
  mockLiqServiceUrl: 'http://localhost:4000',
  submittedEvents: []
};

// Global setup and teardown for the entire feature
Before({ tags: '@api-integration' }, function () {
  // Reset test context for each scenario
  testContext.submittedEvents = [];
  testContext.response = undefined;
  testContext.error = undefined;
  testContext.requestPayload = undefined;
});

// Start services once for all scenarios in this feature
Before({ tags: '@api-integration', timeout: 30000 }, async function () {
  // Only start if not already running
  if (!testContext.mockLiqServer) {
    await startMockLiquidationService();
  }
  
  // Start main service (this handles the check internally)
  await startLocalServer();
});

After({ tags: '@api-integration' }, async function () {
  // Don't stop between scenarios to maintain state for idempotency testing
  // Services will be stopped when the process exits
});

// Mock liquidation service helpers
async function startMockLiquidationService(): Promise<void> {
  if (testContext.mockLiqServer) {
    return;
  }

  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    // Mock endpoints
    app.post('/loan-applications', (req, res) => {
      testContext.submittedEvents.push({
        type: 'loan-application',
        payload: req.body,
        timestamp: new Date().toISOString()
      });
      res.status(200).json({ message: 'Loan application received' });
    });

    app.post('/collateral-top-ups', (req, res) => {
      testContext.submittedEvents.push({
        type: 'collateral-top-up',
        payload: req.body,
        timestamp: new Date().toISOString()
      });
      res.status(200).json({ message: 'Collateral top-up received' });
    });

    testContext.mockLiqServer = app.listen(4000, () => {
      resolve();
    });
  });
}

async function stopMockLiquidationService(): Promise<void> {
  if (!testContext.mockLiqServer) {
    return;
  }

  return new Promise((resolve, reject) => {
    testContext.mockLiqServer!.close((err) => {
      if (err) {
        reject(err);
      } else {
        testContext.mockLiqServer = undefined;
        resolve();
      }
    });
  });
}

// Step definitions
// Note: 'the Coruscant Bank OTC service is running' step is defined in loan-application.step.ts

Given('the liquidation service is available', function () {
  // Mock service should be started in Before hook
  assert.ok(testContext.mockLiqServer, 'Mock liquidation service should be running');
});

Given('I have a valid loan application payload', function () {
  testContext.requestId = uuidv4();
  testContext.requestPayload = {
    requestId: testContext.requestId,
    loanId: `loan-${uuidv4()}`,
    amount: '1000.00',
    borrowerId: `borrower-${uuidv4()}`,
    collateralAmount: '1200.00',
    assetType: 'BSK'
  };
});

Given('I have an invalid loan application payload missing required fields', function () {
  testContext.requestPayload = {
    requestId: uuidv4()
    // Missing required fields: loanId, amount, borrowerId
  };
});

Given('I have a valid collateral top-up payload', function () {
  testContext.requestId = uuidv4();
  testContext.requestPayload = {
    requestId: testContext.requestId,
    loanId: `loan-${uuidv4()}`,
    borrowerId: `borrower-${uuidv4()}`,
    amount: '500.00',
    assetType: 'BSK'
  };
});

Given('I have an invalid collateral top-up payload', function () {
  testContext.requestPayload = {
    requestId: uuidv4(),
    amount: 'invalid-amount' // Invalid amount format
    // Missing required fields
  };
});

Given('I have submitted some loan applications', async function () {
  // Submit a couple of test applications
  for (let i = 0; i < 2; i++) {
    const payload = {
      requestId: uuidv4(),
      loanId: `loan-${uuidv4()}`,
      amount: '1000.00',
      borrowerId: `borrower-${uuidv4()}`,
      collateralAmount: '1200.00',
      assetType: 'BSK'
    };

    try {
      await axios.post(`${testContext.apiBaseUrl}/api/loan-applications`, payload);
    } catch (error) {
      // Ignore errors for setup
    }
  }
});

Given('I have submitted various events', async function () {
  // Submit different types of events
  const loanPayload = {
    requestId: uuidv4(),
    loanId: `loan-${uuidv4()}`,
    amount: '1000.00',
    borrowerId: `borrower-${uuidv4()}`,
    collateralAmount: '1200.00',
    assetType: 'BSK'
  };

  const topUpPayload = {
    requestId: uuidv4(),
    loanId: `loan-${uuidv4()}`,
    borrowerId: `borrower-${uuidv4()}`,
    amount: '500.00',
    assetType: 'BSK'
  };

  try {
    await axios.post(`${testContext.apiBaseUrl}/api/loan-applications`, loanPayload);
    await axios.post(`${testContext.apiBaseUrl}/api/collateral-top-ups`, topUpPayload);
  } catch (error) {
    // Ignore errors for setup
  }
});

When('I submit the loan application to {string}', async function (endpoint: string) {
  try {
    testContext.response = await axios.post(`${testContext.apiBaseUrl}${endpoint}`, testContext.requestPayload);
  } catch (error) {
    testContext.error = error as AxiosError;
  }
});

When('I submit the same loan application again', async function () {
  try {
    testContext.response = await axios.post(`${testContext.apiBaseUrl}/api/loan-applications`, testContext.requestPayload);
  } catch (error) {
    testContext.error = error as AxiosError;
  }
});

When('I submit the collateral top-up to {string}', async function (endpoint: string) {
  try {
    testContext.response = await axios.post(`${testContext.apiBaseUrl}${endpoint}`, testContext.requestPayload);
  } catch (error) {
    testContext.error = error as AxiosError;
  }
});

When('I request the health check endpoint {string}', async function (endpoint: string) {
  try {
    testContext.response = await axios.get(`${testContext.apiBaseUrl}${endpoint}`);
  } catch (error) {
    testContext.error = error as AxiosError;
  }
});

When('I request the events endpoint {string}', async function (endpoint: string) {
  try {
    testContext.response = await axios.get(`${testContext.apiBaseUrl}${endpoint}`);
  } catch (error) {
    testContext.error = error as AxiosError;
  }
});

When('I request event history with type filter {string}', async function (eventType: string) {
  try {
    testContext.response = await axios.get(`${testContext.apiBaseUrl}/api/event-history?type=${eventType}`);
  } catch (error) {
    testContext.error = error as AxiosError;
  }
});

When('I request event history with direction filter {string}', async function (direction: string) {
  try {
    testContext.response = await axios.get(`${testContext.apiBaseUrl}/api/event-history?direction=${direction}`);
  } catch (error) {
    testContext.error = error as AxiosError;
  }
});

Then('I should receive a {int} response', function (statusCode: number) {
  if (testContext.response) {
    assert.strictEqual(testContext.response.status, statusCode);
  } else if (testContext.error && testContext.error.response) {
    assert.strictEqual(testContext.error.response.status, statusCode);
  } else {
    assert.fail('No response received');
  }
});

Then('the response should contain a request ID', function () {
  assert.ok(testContext.response, 'Response should exist');
  assert.ok(testContext.response.data.requestId, 'Response should contain requestId');
  assert.strictEqual(testContext.response.data.requestId, testContext.requestId);
});

Then('the response should contain a timestamp', function () {
  assert.ok(testContext.response, 'Response should exist');
  assert.ok(testContext.response.data.timestamp, 'Response should contain timestamp');
  assert.ok(new Date(testContext.response.data.timestamp).getTime() > 0, 'Timestamp should be valid');
});

Then('the response should indicate if SNS publishing is enabled', function () {
  assert.ok(testContext.response, 'Response should exist');
  assert.ok(testContext.response.data.hasOwnProperty('publishedToSNS'), 'Response should indicate SNS publishing status');
  assert.strictEqual(typeof testContext.response.data.publishedToSNS, 'boolean');
});

Then('the response should contain validation errors', function () {
  assert.ok(testContext.error && testContext.error.response, 'Error response should exist');
  const errorData = testContext.error.response.data as any;
  assert.ok(errorData.error, 'Response should contain error message');
});

Then('the response should indicate the request was already processed', function () {
  assert.ok(testContext.error && testContext.error.response, 'Error response should exist');
  const errorData = testContext.error.response.data as any;
  assert.ok(errorData.message || errorData.error, 'Response should contain message about duplicate request');
});

Then('the loan application should be forwarded to the liquidation service', function () {
  const loanEvents = testContext.submittedEvents.filter(e => e.type === 'loan-application');
  assert.ok(loanEvents.length > 0, 'At least one loan application should be forwarded');
  
  const lastEvent = loanEvents[loanEvents.length - 1];
  assert.strictEqual(lastEvent.payload.requestId, testContext.requestId);
});

Then('the collateral top-up should be forwarded to the liquidation service', function () {
  const topUpEvents = testContext.submittedEvents.filter(e => e.type === 'collateral-top-up');
  assert.ok(topUpEvents.length > 0, 'At least one collateral top-up should be forwarded');
  
  const lastEvent = topUpEvents[topUpEvents.length - 1];
  assert.strictEqual(lastEvent.payload.requestId, testContext.requestId);
});

Then('the response should contain the system status', function () {
  assert.ok(testContext.response, 'Response should exist');
  assert.ok(testContext.response.data.status, 'Response should contain status');
  assert.strictEqual(testContext.response.data.status, 'ok');
});

Then('the response should contain the event count', function () {
  assert.ok(testContext.response, 'Response should exist');
  assert.ok(typeof testContext.response.data.eventCount === 'number', 'Response should contain event count');
});

Then('the response should indicate SNS publishing status', function () {
  assert.ok(testContext.response, 'Response should exist');
  assert.ok(typeof testContext.response.data.selfPublishingEnabled === 'boolean', 'Response should contain SNS publishing status');
});

Then('the response should contain the list of events', function () {
  assert.ok(testContext.response, 'Response should exist');
  assert.ok(Array.isArray(testContext.response.data.events), 'Response should contain events array');
});

Then('the response should only contain loan application events', function () {
  assert.ok(testContext.response, 'Response should exist');
  assert.ok(Array.isArray(testContext.response.data.events), 'Response should contain events array');
  
  const events = testContext.response.data.events;
  if (events.length > 0) {
    events.forEach((event: any) => {
      assert.strictEqual(event.type, 'LOAN_APPLICATION', 'All events should be loan applications');
    });
  }
});

Then('the response should only contain outbound events', function () {
  assert.ok(testContext.response, 'Response should exist');
  assert.ok(Array.isArray(testContext.response.data.events), 'Response should contain events array');
  
  const events = testContext.response.data.events;
  if (events.length > 0) {
    events.forEach((event: any) => {
      assert.strictEqual(event.direction, 'OUTBOUND', 'All events should be outbound');
    });
  }
});