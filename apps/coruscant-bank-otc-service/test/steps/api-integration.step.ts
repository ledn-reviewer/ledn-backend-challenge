import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import assert from 'assert';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Application } from '../../src/main';

// Mock liquidation service
import express from 'express';
import { Server } from 'http';

interface TestContext {
  apiBaseUrl: string;
  mockLiqServiceUrl: string;
  mockLiqServer?: Server;
  application?: Application;
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
Before({ tags: '@api-integration' }, async function () {
  // Reset test context for each scenario
  testContext.requestPayload = undefined;
  testContext.response = undefined;
  testContext.error = undefined;
  testContext.requestId = undefined;
  testContext.submittedEvents = [];

  // Start the application
  testContext.application = new Application();
  await testContext.application.start();

  // Start mock liquidation service
  const mockApp = express();
  mockApp.use(express.json());
  
  mockApp.post('/liquidation-request', (req, res) => {
    res.json({ success: true, liquidationId: uuidv4() });
  });
  
  mockApp.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  testContext.mockLiqServer = mockApp.listen(4000);
});

After({ tags: '@api-integration' }, async function () {
  // Clean up
  if (testContext.application) {
    await testContext.application.stop();
  }
  
  if (testContext.mockLiqServer) {
    testContext.mockLiqServer.close();
  }
});

Given('I have a valid loan application request', function () {
  testContext.requestId = uuidv4();
  testContext.requestPayload = {
    requestId: testContext.requestId,
    borrowerId: "borrower-123",
    loanAmount: 10000,
    collateralAmount: 50,
    assetType: "BESKAR"
  };
});

Given('I have a loan application with missing required field {string}', function (field: string) {
  testContext.requestId = uuidv4();
  testContext.requestPayload = {
    requestId: testContext.requestId,
    borrowerId: "borrower-123",
    loanAmount: 10000,
    collateralAmount: 50,
    assetType: "BESKAR"
  };
  delete testContext.requestPayload[field];
});

When('I submit the loan application', async function () {
  try {
    testContext.response = await axios.post(
      `${testContext.apiBaseUrl}/api/loan-application`,
      testContext.requestPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      }
    );
  } catch (error) {
    testContext.error = error as AxiosError;
  }
});

Then('the API should respond with status code {int}', function (expectedStatusCode: number) {
  if (testContext.error) {
    assert.strictEqual(testContext.error.response?.status, expectedStatusCode);
  } else {
    assert.strictEqual(testContext.response?.status, expectedStatusCode);
  }
});

Then('the response should contain a loan ID', function () {
  assert(testContext.response?.data);
  assert(testContext.response.data.loanId);
  assert(typeof testContext.response.data.loanId === 'string');
});

Then('the response should contain the request ID', function () {
  assert(testContext.response?.data);
  assert.strictEqual(testContext.response.data.requestId, testContext.requestId);
});

Then('the response should indicate the loan status is {string}', function (expectedStatus: string) {
  assert(testContext.response?.data);
  assert.strictEqual(testContext.response.data.status, expectedStatus);
});

Then('the response should contain an error message about {string}', function (expectedErrorType: string) {
  assert(testContext.error?.response?.data);
  const data = testContext.error.response.data as any;
  const errorMessage = data.message || data.error || JSON.stringify(data);
  assert(errorMessage.toLowerCase().includes(expectedErrorType.toLowerCase()));
});