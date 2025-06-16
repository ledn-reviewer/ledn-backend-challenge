import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import assert from 'assert';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Application } from '../../src/main';

// Mock liquidation service
import express from 'express';
import { Server } from 'http';

interface TestContext {
  application?: Application;
  mockLiqServer?: Server;
  borrowerId: string;
  loanAmount: number;
  collateralAmount: number;
  assetType: string;
  requestId: string;
  response?: AxiosResponse;
  error?: AxiosError;
}

const testContext: TestContext = {
  borrowerId: '',
  loanAmount: 0,
  collateralAmount: 0,
  assetType: 'BESKAR',
  requestId: ''
};

Before({ tags: '@loan-application' }, async function () {
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

After({ tags: '@loan-application' }, async function () {
  if (testContext.application) {
    await testContext.application.stop();
  }
  
  if (testContext.mockLiqServer) {
    testContext.mockLiqServer.close();
  }
});

Given('a borrower with ID {string}', function (borrowerId: string) {
  testContext.borrowerId = borrowerId;
});

Given('they want to borrow {int} credits', function (amount: number) {
  testContext.loanAmount = amount;
});

Given('they provide {int} units of {string} as collateral', function (amount: number, assetType: string) {
  testContext.collateralAmount = amount;
  testContext.assetType = assetType;
});

When('they submit a loan application', async function () {
  testContext.requestId = uuidv4();
  
  const payload = {
    requestId: testContext.requestId,
    borrowerId: testContext.borrowerId,
    loanAmount: testContext.loanAmount,
    collateralAmount: testContext.collateralAmount,
    assetType: testContext.assetType
  };

  try {
    testContext.response = await axios.post(
      'http://localhost:3000/api/loan-application',
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      }
    );
  } catch (error) {
    testContext.error = error as AxiosError;
  }
});

Then('the loan application should be {string}', function (expectedStatus: string) {
  if (expectedStatus === 'approved') {
    assert(testContext.response);
    assert.strictEqual(testContext.response.status, 201);
    assert(testContext.response.data.loanId);
    assert.strictEqual(testContext.response.data.status, 'APPROVED');
  } else if (expectedStatus === 'rejected') {
    assert(testContext.error);
    assert.strictEqual(testContext.error.response?.status, 400);
  }
});

Then('they should receive a loan ID', function () {
  assert(testContext.response?.data);
  assert(testContext.response.data.loanId);
  assert(typeof testContext.response.data.loanId === 'string');
});

Then('the loan should be in {string} status', function (expectedStatus: string) {
  assert(testContext.response?.data);
  assert.strictEqual(testContext.response.data.status, expectedStatus);
});

Then('they should receive an error about insufficient collateral', function () {
  assert(testContext.error?.response?.data);
  const data = testContext.error.response.data as any;
  const errorMessage = data.message || data.error || JSON.stringify(data);
  assert(errorMessage.toLowerCase().includes('insufficient') || 
         errorMessage.toLowerCase().includes('collateral'));
});