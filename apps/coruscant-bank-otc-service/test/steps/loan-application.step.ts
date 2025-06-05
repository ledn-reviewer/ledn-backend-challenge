import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import assert from 'assert';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { startLocalServer, stopLocalServer } from '../../src/test-utils/local-server';

// State object to share data between steps
const state: {
  apiBaseUrl: string;
  loanId?: string;
  borrowerId?: string;
  response?: any;
  error?: any;
} = {
  apiBaseUrl: 'http://localhost:3000',
};

// Before hooks
Before(async function() {
  // Start a local server instance for testing
  await startLocalServer();
});

// After hooks
After(async function() {
  // Shutdown the server after tests
  await stopLocalServer();
});

Given('the Coruscant Bank OTC service is running', function() {
  // The Before hook should have already started the service
});

Given('I have an existing loan', function() {
  state.loanId = `loan-${uuidv4()}`;
  state.borrowerId = `borrower-${uuidv4()}`;
  // We'll pretend we already have a loan for this step
});

When('I submit a valid loan application', async function() {
  try {
    state.response = await axios.post(`${state.apiBaseUrl}/loan-applications`, {
      requestId: uuidv4(),
      loanId: `loan-${uuidv4()}`,
      amount: '1000',
      borrowerId: `borrower-${uuidv4()}`
    });
  } catch (error) {
    state.error = error;
  }
});

When('I submit an invalid loan application', async function() {
  try {
    state.response = await axios.post(`${state.apiBaseUrl}/loan-applications`, {
      // Missing required fields
      requestId: uuidv4()
    });
  } catch (error) {
    state.error = error;
  }
});

When('I submit a valid collateral top-up', async function() {
  try {
    state.response = await axios.post(`${state.apiBaseUrl}/collateral-top-ups`, {
      requestId: uuidv4(),
      loanId: state.loanId,
      borrowerId: state.borrowerId,
      amount: '500'
    });
  } catch (error) {
    state.error = error;
  }
});

Then('I should receive a successful response', function() {
  assert.strictEqual(state.response.status, 202);
});

Then('I should receive a validation error', function() {
  assert.strictEqual(state.error.response.status, 400);
});

Then('the loan event should be published to SNS', async function() {
  // This would verify that the event was published to SNS
  // In a real implementation, we might check a mock or an actual SNS topic
});

Then('the collateral top-up event should be published to SNS', async function() {
  // This would verify that the event was published to SNS
  // In a real implementation, we might check a mock or an actual SNS topic
});
