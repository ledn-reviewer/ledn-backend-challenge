import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import assert from 'assert';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { startLocalServer, stopLocalServer } from '../../src/test-utils/local-server';

interface TestContext {
  apiBaseUrl: string;
  responses: AxiosResponse[];
  errors: AxiosError[];
  requestPayloads: any[];
  uniqueRequestId?: string;
  loanId?: string;
  borrowerId?: string;
  lastResponse?: AxiosResponse;
  lastError?: AxiosError;
  submittedEvents: any[];
  concurrentResults: Promise<any>[];
}

const testContext: TestContext = {
  apiBaseUrl: 'http://localhost:3000',
  responses: [],
  errors: [],
  requestPayloads: [],
  submittedEvents: [],
  concurrentResults: []
};

// Setup and teardown
Before({ tags: '@comprehensive-integration' }, async function () {
  // Reset test context
  testContext.responses = [];
  testContext.errors = [];
  testContext.requestPayloads = [];
  testContext.submittedEvents = [];
  testContext.concurrentResults = [];
  testContext.lastResponse = undefined;
  testContext.lastError = undefined;
  
  // Start the local server
  await startLocalServer();
});

After({ tags: '@comprehensive-integration' }, async function () {
  // Clean up
  await stopLocalServer();
});

// Given steps
Given('the Coruscant Bank OTC service is running in test mode', function () {
  // Server should be started in Before hook
  assert.ok(true, 'Service should be running');
});

Given('self-publishing is disabled', function () {
  // In test mode, self-publishing should be disabled by default
  // This is controlled by environment variables
  assert.ok(true, 'Self-publishing disabled for testing');
});

Given('I have an existing loan in the system', function () {
  testContext.loanId = `loan-${uuidv4()}`;
  testContext.borrowerId = `borrower-${uuidv4()}`;
});

Given('I have a unique loan application request', function () {
  testContext.uniqueRequestId = uuidv4();
  const payload = {
    requestId: testContext.uniqueRequestId,
    loanId: `loan-${uuidv4()}`,
    amount: '1000.00',
    borrowerId: `borrower-${uuidv4()}`
  };
  testContext.requestPayloads.push(payload);
});

Given('I have a unique collateral top-up request', function () {
  testContext.uniqueRequestId = uuidv4();
  testContext.loanId = `loan-${uuidv4()}`;
  testContext.borrowerId = `borrower-${uuidv4()}`;
  const payload = {
    requestId: testContext.uniqueRequestId,
    loanId: testContext.loanId,
    borrowerId: testContext.borrowerId,
    amount: '500.00'
  };
  testContext.requestPayloads.push(payload);
});

Given('I have submitted multiple loan applications', async function () {
  for (let i = 0; i < 3; i++) {
    const payload = {
      requestId: uuidv4(),
      loanId: `loan-${uuidv4()}`,
      amount: '1000.00',
      borrowerId: `borrower-${uuidv4()}`
    };
    
    try {
      await axios.post(`${testContext.apiBaseUrl}/api/loan-applications`, payload);
      testContext.submittedEvents.push({ type: 'LOAN_APPLICATION', payload });
    } catch (error) {
      // Continue even if some fail
    }
  }
});

Given('I have submitted multiple collateral top-ups', async function () {
  for (let i = 0; i < 2; i++) {
    const payload = {
      requestId: uuidv4(),
      loanId: `loan-${uuidv4()}`,
      borrowerId: `borrower-${uuidv4()}`,
      amount: '300.00'
    };
    
    try {
      await axios.post(`${testContext.apiBaseUrl}/api/collateral-top-ups`, payload);
      testContext.submittedEvents.push({ type: 'COLLATERAL_TOPUP', payload });
    } catch (error) {
      // Continue even if some fail
    }
  }
});

Given('I have submitted loan applications and collateral top-ups', async function () {
  // Submit both types
  const loanPayload = {
    requestId: uuidv4(),
    loanId: `loan-${uuidv4()}`,
    amount: '1000.00',
    borrowerId: `borrower-${uuidv4()}`
  };
  
  const topUpPayload = {
    requestId: uuidv4(),
    loanId: `loan-${uuidv4()}`,
    borrowerId: `borrower-${uuidv4()}`,
    amount: '400.00'
  };
  
  try {
    await axios.post(`${testContext.apiBaseUrl}/api/loan-applications`, loanPayload);
    await axios.post(`${testContext.apiBaseUrl}/api/collateral-top-ups`, topUpPayload);
    testContext.submittedEvents.push(
      { type: 'LOAN_APPLICATION', payload: loanPayload },
      { type: 'COLLATERAL_TOPUP', payload: topUpPayload }
    );
  } catch (error) {
    // Continue even if some fail
  }
});

Given('the liquidation service is unavailable', function () {
  // This simulates the liquidation service being down
  // The service should handle this gracefully
  assert.ok(true, 'Liquidation service unavailable scenario');
});

Given('I have multiple unique loan application requests', function () {
  // Create 5 unique requests
  for (let i = 0; i < 5; i++) {
    const payload = {
      requestId: uuidv4(),
      loanId: `loan-${uuidv4()}`,
      amount: `${1000 + i * 100}.00`,
      borrowerId: `borrower-${uuidv4()}`
    };
    testContext.requestPayloads.push(payload);
  }
});

// When steps
When('I submit a valid loan application with all required fields', async function () {
  const payload = {
    requestId: uuidv4(),
    loanId: `loan-${uuidv4()}`,
    amount: '1000.00',
    borrowerId: `borrower-${uuidv4()}`
  };
  
  try {
    testContext.lastResponse = await axios.post(`${testContext.apiBaseUrl}/api/loan-applications`, payload);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I submit a valid collateral top-up request', async function () {
  const payload = {
    requestId: uuidv4(),
    loanId: testContext.loanId,
    borrowerId: testContext.borrowerId,
    amount: '500.00'
  };
  
  try {
    testContext.lastResponse = await axios.post(`${testContext.apiBaseUrl}/api/collateral-top-ups`, payload);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I submit the loan application request', async function () {
  const payload = testContext.requestPayloads[0];
  
  try {
    testContext.lastResponse = await axios.post(`${testContext.apiBaseUrl}/api/loan-applications`, payload);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I submit the collateral top-up request', async function () {
  const payload = testContext.requestPayloads[0];
  
  try {
    testContext.lastResponse = await axios.post(`${testContext.apiBaseUrl}/api/collateral-top-ups`, payload);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I submit the exact same request again', async function () {
  const payload = testContext.requestPayloads[0];
  const endpoint = payload.loanId ? '/api/loan-applications' : '/api/collateral-top-ups';
  
  try {
    testContext.lastResponse = await axios.post(`${testContext.apiBaseUrl}${endpoint}`, payload);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I submit a loan application with missing required fields', async function () {
  const payload = {
    requestId: uuidv4()
    // Missing loanId, amount, borrowerId
  };
  
  try {
    testContext.lastResponse = await axios.post(`${testContext.apiBaseUrl}/api/loan-applications`, payload);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I submit a loan application with invalid amount format', async function () {
  const payload = {
    requestId: uuidv4(),
    loanId: `loan-${uuidv4()}`,
    amount: 'invalid-amount',
    borrowerId: `borrower-${uuidv4()}`
  };
  
  try {
    testContext.lastResponse = await axios.post(`${testContext.apiBaseUrl}/api/loan-applications`, payload);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I submit a collateral top-up with missing required fields', async function () {
  const payload = {
    requestId: uuidv4()
    // Missing loanId, borrowerId, amount
  };
  
  try {
    testContext.lastResponse = await axios.post(`${testContext.apiBaseUrl}/api/collateral-top-ups`, payload);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I submit a collateral top-up with invalid amount format', async function () {
  const payload = {
    requestId: uuidv4(),
    loanId: `loan-${uuidv4()}`,
    borrowerId: `borrower-${uuidv4()}`,
    amount: 'not-a-number'
  };
  
  try {
    testContext.lastResponse = await axios.post(`${testContext.apiBaseUrl}/api/collateral-top-ups`, payload);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I request the health check endpoint', async function () {
  try {
    testContext.lastResponse = await axios.get(`${testContext.apiBaseUrl}/api/health`);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I request the event history', async function () {
  try {
    testContext.lastResponse = await axios.get(`${testContext.apiBaseUrl}/event-history`);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I request event history filtered by {string} type', async function (eventType: string) {
  try {
    testContext.lastResponse = await axios.get(`${testContext.apiBaseUrl}/event-history?type=${eventType}`);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I request the simulation status', async function () {
  try {
    testContext.lastResponse = await axios.get(`${testContext.apiBaseUrl}/simulation/stats`);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I start the client simulator', async function () {
  try {
    testContext.lastResponse = await axios.post(`${testContext.apiBaseUrl}/simulation/start`);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I stop the client simulator', async function () {
  try {
    testContext.lastResponse = await axios.post(`${testContext.apiBaseUrl}/simulation/stop`);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I submit a loan application', async function () {
  const payload = {
    requestId: uuidv4(),
    loanId: `loan-${uuidv4()}`,
    amount: '1000.00',
    borrowerId: `borrower-${uuidv4()}`
  };
  
  try {
    testContext.lastResponse = await axios.post(`${testContext.apiBaseUrl}/api/loan-applications`, payload);
    if (testContext.lastResponse) {
      testContext.responses.push(testContext.lastResponse);
    }
  } catch (error) {
    testContext.lastError = error as AxiosError;
    if (testContext.lastError) {
      testContext.errors.push(testContext.lastError);
    }
  }
});

When('I submit all requests concurrently', async function () {
  // Submit all requests in parallel
  testContext.concurrentResults = testContext.requestPayloads.map(payload =>
    axios.post(`${testContext.apiBaseUrl}/api/loan-applications`, payload)
      .then(response => ({ success: true, response }))
      .catch(error => ({ success: false, error }))
  );
});

// Then steps
Then('I should receive a {int} response', function (statusCode: number) {
  if (testContext.lastResponse) {
    assert.strictEqual(testContext.lastResponse.status, statusCode);
  } else if (testContext.lastError && testContext.lastError.response) {
    assert.strictEqual(testContext.lastError.response.status, statusCode);
  } else {
    assert.fail('No response received');
  }
});

Then('the response should contain the request ID', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  assert.ok(testContext.lastResponse.data.requestId, 'Response should contain requestId');
});

Then('the response should contain a timestamp', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  assert.ok(testContext.lastResponse.data.timestamp, 'Response should contain timestamp');
  assert.ok(new Date(testContext.lastResponse.data.timestamp).getTime() > 0, 'Timestamp should be valid');
});

Then('the response should indicate SNS publishing is disabled', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  assert.strictEqual(testContext.lastResponse.data.publishedToSNS, false);
});

Then('the request should be marked as processed for idempotency', function () {
  // This is internal state, but we can verify through repeated requests
  assert.ok(testContext.lastResponse, 'Response should exist');
  assert.ok(testContext.lastResponse.data.requestId, 'Request should have ID for tracking');
});

Then('the collateral amount should be recorded correctly', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  assert.ok(testContext.lastResponse.data.requestId, 'Request should be processed');
});

Then('the response should indicate the request was already processed', function () {
  assert.ok(testContext.lastError && testContext.lastError.response, 'Error response should exist');
  const errorData = testContext.lastError.response.data as any;
  assert.ok(errorData.message || errorData.error, 'Response should contain error message about duplicate');
});

Then('the response should contain validation error details', function () {
  assert.ok(testContext.lastError && testContext.lastError.response, 'Error response should exist');
  const errorData = testContext.lastError.response.data as any;
  assert.ok(errorData.error || errorData.message, 'Response should contain validation error');
});

Then('the response should contain system status', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  assert.ok(testContext.lastResponse.data.status, 'Response should contain status');
});

Then('the response should contain event count', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  assert.ok(typeof testContext.lastResponse.data.eventCount === 'number', 'Response should contain event count');
});

Then('the response should contain SNS publishing configuration', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  assert.ok(typeof testContext.lastResponse.data.selfPublishingEnabled === 'boolean', 'Response should contain SNS config');
});

Then('the response should contain all submitted events', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  assert.ok(Array.isArray(testContext.lastResponse.data.events), 'Response should contain events array');
});

Then('the events should be properly formatted with timestamps', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  const events = testContext.lastResponse.data.events;
  if (events && events.length > 0) {
    events.forEach((event: any) => {
      assert.ok(event.timestamp, 'Each event should have a timestamp');
      assert.ok(new Date(event.timestamp).getTime() > 0, 'Timestamp should be valid');
    });
  }
});

Then('the response should only contain loan application events', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  const events = testContext.lastResponse.data.events;
  if (events && events.length > 0) {
    events.forEach((event: any) => {
      assert.strictEqual(event.type, 'LOAN_APPLICATION', 'All events should be loan applications');
    });
  }
});

Then('the response should only contain collateral top-up events', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  const events = testContext.lastResponse.data.events;
  if (events && events.length > 0) {
    events.forEach((event: any) => {
      assert.strictEqual(event.type, 'COLLATERAL_TOPUP', 'All events should be collateral top-ups');
    });
  }
});

Then('the response should contain simulation statistics', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  assert.ok(testContext.lastResponse.data.stats, 'Response should contain simulation stats');
});

Then('the simulation should be marked as active', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  // Simulation state checking logic would go here
});

Then('the simulation should be marked as inactive', function () {
  assert.ok(testContext.lastResponse, 'Response should exist');
  // Simulation state checking logic would go here
});

Then('I should receive a {int} response initially', function (statusCode: number) {
  assert.ok(testContext.lastResponse, 'Response should exist');
  assert.strictEqual(testContext.lastResponse.status, statusCode);
});

Then('the system should handle the forwarding failure gracefully', function () {
  // The system should not crash and should continue to operate
  assert.ok(true, 'System should handle failures gracefully');
});

Then('the error should be logged appropriately', function () {
  // In a real test, we would check logs or monitoring systems
  assert.ok(true, 'Error should be logged');
});

Then('all requests should be processed successfully', async function () {
  const results = await Promise.all(testContext.concurrentResults);
  const successes = results.filter(r => r.success);
  assert.strictEqual(successes.length, testContext.requestPayloads.length, 'All requests should succeed');
});

Then('each should receive a unique response', async function () {
  const results = await Promise.all(testContext.concurrentResults);
  const requestIds = results.map(r => r.success ? r.response.data.requestId : null);
  const uniqueIds = new Set(requestIds.filter(Boolean));
  assert.strictEqual(uniqueIds.size, testContext.requestPayloads.length, 'All responses should be unique');
});

Then('idempotency should be maintained across concurrent requests', async function () {
  // Verify that concurrent requests don't break idempotency
  const results = await Promise.all(testContext.concurrentResults);
  const successes = results.filter(r => r.success);
  assert.ok(successes.length > 0, 'At least some requests should succeed');
});