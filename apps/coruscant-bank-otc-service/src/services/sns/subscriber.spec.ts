import { SubscribeCommand } from '@aws-sdk/client-sns';
import { subscribeSqsToSnsTopic } from './subscriber';
import { snsClient } from '../../factories/snsClient';
import { LOAN_EVENTS_TOPIC_ARN, LOAN_QUEUE_ARN } from '../../helpers/aws';
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('../../factories/snsClient', () => ({
  snsClient: {
    send: jest.fn()
  }
}));

jest.mock('../../helpers/aws', () => ({
  LOAN_EVENTS_TOPIC_ARN: 'arn:aws:sns:us-east-1:123456789:test-loan-events',
  LOAN_QUEUE_ARN: 'arn:aws:sqs:us-east-1:123456789:test-loan-queue'
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

const mockedSnsClient = snsClient as unknown as { send: jest.Mock };

describe('SNS Subscriber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribeSqsToSnsTopic', () => {
    it('should successfully subscribe SQS queue to SNS topic', async () => {
      const mockSubscriptionArn = 'arn:aws:sns:us-east-1:123456789:test-loan-events:subscription-id';
      
      mockedSnsClient.send.mockResolvedValue({
        SubscriptionArn: mockSubscriptionArn
      });

      const result = await subscribeSqsToSnsTopic();

      expect(mockedSnsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            TopicArn: LOAN_EVENTS_TOPIC_ARN,
            Protocol: 'sqs',
            Endpoint: LOAN_QUEUE_ARN
          }
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        { subscriptionArn: mockSubscriptionArn },
        'Successfully subscribed SQS queue to SNS topic'
      );

      expect(result).toBe(mockSubscriptionArn);
    });

    it('should handle response with undefined SubscriptionArn', async () => {
      mockedSnsClient.send.mockResolvedValue({
        SubscriptionArn: undefined
      });

      const result = await subscribeSqsToSnsTopic();

      expect(logger.info).toHaveBeenCalledWith(
        { subscriptionArn: undefined },
        'Successfully subscribed SQS queue to SNS topic'
      );

      expect(result).toBe('');
    });

    it('should handle response with null SubscriptionArn', async () => {
      mockedSnsClient.send.mockResolvedValue({
        SubscriptionArn: null
      });

      const result = await subscribeSqsToSnsTopic();

      expect(logger.info).toHaveBeenCalledWith(
        { subscriptionArn: null },
        'Successfully subscribed SQS queue to SNS topic'
      );

      expect(result).toBe('');
    });

    it('should handle response with empty string SubscriptionArn', async () => {
      mockedSnsClient.send.mockResolvedValue({
        SubscriptionArn: ''
      });

      const result = await subscribeSqsToSnsTopic();

      expect(logger.info).toHaveBeenCalledWith(
        { subscriptionArn: '' },
        'Successfully subscribed SQS queue to SNS topic'
      );

      expect(result).toBe('');
    });

    it('should handle SNS client errors and rethrow them', async () => {
      const snsError = new Error('SNS subscription failed');
      mockedSnsClient.send.mockRejectedValue(snsError);

      await expect(subscribeSqsToSnsTopic()).rejects.toThrow(snsError);

      expect(logger.error).toHaveBeenCalledWith(
        { error: snsError },
        'Error subscribing SQS queue to SNS topic'
      );
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockedSnsClient.send.mockRejectedValue(timeoutError);

      await expect(subscribeSqsToSnsTopic()).rejects.toThrow(timeoutError);

      expect(logger.error).toHaveBeenCalledWith(
        { error: timeoutError },
        'Error subscribing SQS queue to SNS topic'
      );
    });

    it('should handle access denied errors', async () => {
      const accessError = new Error('Access Denied');
      accessError.name = 'AccessDenied';
      mockedSnsClient.send.mockRejectedValue(accessError);

      await expect(subscribeSqsToSnsTopic()).rejects.toThrow(accessError);

      expect(logger.error).toHaveBeenCalledWith(
        { error: accessError },
        'Error subscribing SQS queue to SNS topic'
      );
    });

    it('should use correct SubscribeCommand instance', async () => {
      mockedSnsClient.send.mockResolvedValue({
        SubscriptionArn: 'test-arn'
      });

      await subscribeSqsToSnsTopic();

      const sentCommand = mockedSnsClient.send.mock.calls[0][0];
      expect(sentCommand).toBeInstanceOf(SubscribeCommand);
    });

    it('should use environment-specific topic and queue ARNs', async () => {
      mockedSnsClient.send.mockResolvedValue({
        SubscriptionArn: 'test-arn'
      });

      await subscribeSqsToSnsTopic();

      expect(mockedSnsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            TopicArn: 'arn:aws:sns:us-east-1:123456789:test-loan-events',
            Protocol: 'sqs',
            Endpoint: 'arn:aws:sqs:us-east-1:123456789:test-loan-queue'
          }
        })
      );
    });

    it('should handle multiple consecutive subscription calls', async () => {
      const subscriptionArn1 = 'arn:aws:sns:us-east-1:123456789:test-loan-events:sub-1';
      const subscriptionArn2 = 'arn:aws:sns:us-east-1:123456789:test-loan-events:sub-2';

      mockedSnsClient.send
        .mockResolvedValueOnce({ SubscriptionArn: subscriptionArn1 })
        .mockResolvedValueOnce({ SubscriptionArn: subscriptionArn2 });

      const result1 = await subscribeSqsToSnsTopic();
      const result2 = await subscribeSqsToSnsTopic();

      expect(result1).toBe(subscriptionArn1);
      expect(result2).toBe(subscriptionArn2);

      expect(logger.info).toHaveBeenCalledTimes(2);
      expect(mockedSnsClient.send).toHaveBeenCalledTimes(2);
    });

    it('should handle partial response objects', async () => {
      // Response with only SubscriptionArn (missing other potential fields)
      mockedSnsClient.send.mockResolvedValue({
        SubscriptionArn: 'test-arn-123'
      });

      const result = await subscribeSqsToSnsTopic();

      expect(result).toBe('test-arn-123');
      expect(logger.info).toHaveBeenCalledWith(
        { subscriptionArn: 'test-arn-123' },
        'Successfully subscribed SQS queue to SNS topic'
      );
    });

    it('should handle response with additional unexpected properties', async () => {
      mockedSnsClient.send.mockResolvedValue({
        SubscriptionArn: 'test-arn-456',
        SomeOtherProperty: 'unexpected-value',
        AnotherField: 123
      });

      const result = await subscribeSqsToSnsTopic();

      expect(result).toBe('test-arn-456');
      expect(logger.info).toHaveBeenCalledWith(
        { subscriptionArn: 'test-arn-456' },
        'Successfully subscribed SQS queue to SNS topic'
      );
    });

    it('should handle empty response object', async () => {
      mockedSnsClient.send.mockResolvedValue({});

      const result = await subscribeSqsToSnsTopic();

      expect(result).toBe('');
      expect(logger.info).toHaveBeenCalledWith(
        { subscriptionArn: undefined },
        'Successfully subscribed SQS queue to SNS topic'
      );
    });

    it('should handle complex error scenarios', async () => {
      const complexError = new Error('Complex SNS error');
      complexError.name = 'InvalidParameterException';
      
      // Add some properties that might exist on AWS SDK errors
      (complexError as any).code = 'InvalidParameter';
      (complexError as any).statusCode = 400;
      (complexError as any).requestId = 'req-123';

      mockedSnsClient.send.mockRejectedValue(complexError);

      await expect(subscribeSqsToSnsTopic()).rejects.toThrow(complexError);

      expect(logger.error).toHaveBeenCalledWith(
        { error: complexError },
        'Error subscribing SQS queue to SNS topic'
      );
    });

    it('should maintain the correct protocol setting', async () => {
      mockedSnsClient.send.mockResolvedValue({
        SubscriptionArn: 'test-arn'
      });

      await subscribeSqsToSnsTopic();

      const command = mockedSnsClient.send.mock.calls[0][0];
      expect(command.input.Protocol).toBe('sqs');
    });
  });
});