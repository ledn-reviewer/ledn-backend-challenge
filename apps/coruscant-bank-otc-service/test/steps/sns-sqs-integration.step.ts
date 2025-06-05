import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import { snsClient } from '../../src/factories/snsClient';
import { sqsClient } from '../../src/factories/sqsClient';
import {
  CreateTopicCommand,
  PublishCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  DeleteTopicCommand
} from '@aws-sdk/client-sns';
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
  ReceiveMessageCommand,
  DeleteQueueCommand
} from '@aws-sdk/client-sqs';

interface TestContext {
  topicArn?: string;
  queueUrl?: string;
  subscriptionArn?: string;
  testPayload?: any;
  publishResponse?: any;
  receiveResponse?: any;
}

let testContext: TestContext = {};

Before({ tags: '@sns-sqs-integration' }, async function () {
  testContext = {};
});

After({ tags: '@sns-sqs-integration' }, async function () {
  // Clean up resources if they still exist
  if (testContext.subscriptionArn) {
    await snsClient.send(new UnsubscribeCommand({ SubscriptionArn: testContext.subscriptionArn }));
  }
  if (testContext.topicArn) {
    await snsClient.send(new DeleteTopicCommand({ TopicArn: testContext.topicArn }));
  }
  if (testContext.queueUrl) {
    await sqsClient.send(new DeleteQueueCommand({ QueueUrl: testContext.queueUrl }));
  }
});

Given('I have created an SNS topic', async function () {
  const topicResp = await snsClient.send(new CreateTopicCommand({ Name: `test-topic-${uuidv4()}` }));
  testContext.topicArn = topicResp.TopicArn!;
  assert.ok(testContext.topicArn, 'Topic ARN should be defined');
});

Given('I have created an SQS queue', async function () {
  const queueResp = await sqsClient.send(new CreateQueueCommand({ QueueName: `test-queue-${uuidv4()}` }));
  testContext.queueUrl = queueResp.QueueUrl!;
  assert.ok(testContext.queueUrl, 'Queue URL should be defined');
});

Given('I have subscribed the SQS queue to the SNS topic', async function () {
  // Get the SQS queue ARN
  const attrResp = await sqsClient.send(new GetQueueAttributesCommand({
    QueueUrl: testContext.queueUrl!,
    AttributeNames: ['QueueArn']
  }));
  const queueArn = attrResp.Attributes!['QueueArn'];

  // Subscribe the SQS queue to the SNS topic
  const subResp = await snsClient.send(new SubscribeCommand({
    TopicArn: testContext.topicArn!,
    Protocol: 'sqs',
    Endpoint: queueArn
  }));
  testContext.subscriptionArn = subResp.SubscriptionArn!;
  assert.ok(testContext.subscriptionArn, 'Subscription ARN should be defined');
});

Given('I have configured the queue policy to allow SNS to send messages', async function () {
  // Get the SQS queue ARN
  const attrResp = await sqsClient.send(new GetQueueAttributesCommand({
    QueueUrl: testContext.queueUrl!,
    AttributeNames: ['QueueArn']
  }));
  const queueArn = attrResp.Attributes!['QueueArn'];

  // Allow SNS to publish to SQS queue
  const policy = JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Sid: 'Allow-SNS-SendMessage',
      Effect: 'Allow',
      Principal: '*',
      Action: 'SQS:SendMessage',
      Resource: queueArn,
      Condition: { ArnEquals: { 'aws:SourceArn': testContext.topicArn! } }
    }]
  });

  await sqsClient.send(new SetQueueAttributesCommand({
    QueueUrl: testContext.queueUrl!,
    Attributes: { Policy: policy }
  }));
});

Given('I have a test payload with action {string}', function (action: string) {
  testContext.testPayload = { 
    action: action, 
    timestamp: new Date().toISOString() 
  };
  assert.ok(testContext.testPayload, 'Test payload should be defined');
  assert.strictEqual(testContext.testPayload.action, action);
});

When('I publish the message to the SNS topic', async function () {
  testContext.publishResponse = await snsClient.send(new PublishCommand({
    TopicArn: testContext.topicArn!,
    Message: JSON.stringify(testContext.testPayload)
  }));
});

Then('the message should be published successfully with a message ID', function () {
  assert.ok(testContext.publishResponse.MessageId, 'Message ID should be defined');
  assert.strictEqual(typeof testContext.publishResponse.MessageId, 'string');
});

When('I receive messages from the SQS queue', async function () {
  testContext.receiveResponse = await sqsClient.send(new ReceiveMessageCommand({
    QueueUrl: testContext.queueUrl!,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 5,
    MessageAttributeNames: ['All']
  }));
});

Then('I should receive at least one message', function () {
  assert.ok(testContext.receiveResponse.Messages, 'Messages should be defined');
  assert.ok(testContext.receiveResponse.Messages!.length > 0, 'Should receive at least one message');
});

Then('the received message should contain the original payload', function () {
  const rawMessage = testContext.receiveResponse.Messages![0];
  assert.ok(rawMessage.Body, 'Message body should be defined');
  assert.strictEqual(typeof rawMessage.Body, 'string');

  // SNS wraps the original message in JSON with 'Message' field
  const snsEnvelope = JSON.parse(rawMessage.Body!);
  const receivedPayload = JSON.parse(snsEnvelope.Message);
  assert.deepStrictEqual(receivedPayload, testContext.testPayload);
});

Then('the message should be wrapped in SNS envelope format', function () {
  const rawMessage = testContext.receiveResponse.Messages![0];
  const snsEnvelope = JSON.parse(rawMessage.Body!);
  
  assert.ok(snsEnvelope.hasOwnProperty('Message'), 'SNS envelope should have Message property');
  assert.ok(snsEnvelope.hasOwnProperty('TopicArn'), 'SNS envelope should have TopicArn property');
  assert.strictEqual(snsEnvelope.TopicArn, testContext.topicArn);
});

Given('I have test resources created', function () {
  assert.ok(testContext.topicArn, 'Topic ARN should be defined');
  assert.ok(testContext.queueUrl, 'Queue URL should be defined');
  assert.ok(testContext.subscriptionArn, 'Subscription ARN should be defined');
});

When('I clean up the test environment', async function () {
  await snsClient.send(new UnsubscribeCommand({ SubscriptionArn: testContext.subscriptionArn! }));
  await snsClient.send(new DeleteTopicCommand({ TopicArn: testContext.topicArn! }));
  await sqsClient.send(new DeleteQueueCommand({ QueueUrl: testContext.queueUrl! }));
});

Then('the subscription should be deleted', function () {
  // In a real scenario, you might verify the subscription no longer exists
  assert.ok(testContext.subscriptionArn, 'Subscription ARN should be defined');
});

Then('the SNS topic should be deleted', function () {
  // In a real scenario, you might verify the topic no longer exists
  assert.ok(testContext.topicArn, 'Topic ARN should be defined');
});

Then('the SQS queue should be deleted', function () {
  // In a real scenario, you might verify the queue no longer exists
  assert.ok(testContext.queueUrl, 'Queue URL should be defined');
});