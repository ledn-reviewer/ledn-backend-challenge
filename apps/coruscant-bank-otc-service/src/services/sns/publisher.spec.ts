import { PublishCommand } from '@aws-sdk/client-sns';
import { SNSPublisher } from './publisher';
import { isSelfPublishingEnabled } from '../../config/aws';
import { snsClient } from '../../factories/snsClient';

// Mock the modules
jest.mock('../../factories/snsClient');

describe('SNSPublisher', () => {
  let mockSend: jest.Mock;
  let snsPublisher: SNSPublisher;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Setup Jest mocks
    mockSend = jest.fn().mockResolvedValue({ MessageId: 'msg-123' });

    // Apply mocks
    (snsClient.send as jest.Mock) = mockSend;

    // Create a new SNSPublisher instance
    snsPublisher = new SNSPublisher();

    // Set test environment
    process.env.AWS_REGION = 'us-west-2';
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  describe('publish method', () => {
    it('should publish message to SNS topic and return message ID', async () => {
      const topicName = 'test-topic';
      const message = {
        eventType: 'TEST_EVENT',
        data: { foo: 'bar' }
      };

      const messageId = await snsPublisher.publish(topicName, message as any);

      // Verify SNS publish command was sent
      expect(mockSend).toHaveBeenCalledTimes(1);

      // Verify the command parameters
      const cmd = mockSend.mock.calls[0][0];
      expect(cmd).toBeInstanceOf(PublishCommand);
      expect(cmd.input.TopicArn).toBe(`arn:aws:sns:us-west-2:000000000000:${topicName}`);
      expect(JSON.parse(cmd.input.Message)).toEqual(message);
      expect(cmd.input.MessageAttributes).toEqual({
        eventType: {
          DataType: 'String',
          StringValue: 'TEST_EVENT'
        }
      });

      // Verify returned message ID
      expect(messageId).toBe('msg-123');
    });

    it('should publish message without message attributes when eventType is not provided', async () => {
      const topicName = 'test-topic';
      const message = { data: { foo: 'bar' } };

      await snsPublisher.publish(topicName, message as any);

      // Verify the command parameters
      const cmd = mockSend.mock.calls[0][0];
      expect(cmd.input.MessageAttributes).toBeUndefined();
    });

    it('should use default AWS region when not provided', async () => {
      delete process.env.AWS_REGION;

      await snsPublisher.publish('test-topic', { data: { foo: 'bar' } } as any);

      const cmd = mockSend.mock.calls[0][0];
      expect(cmd.input.TopicArn).toContain('us-east-1');
    });

    it('should throw error when SNS publish fails', async () => {
      mockSend.mockRejectedValue(new Error('SNS Error'));

      await expect(
        snsPublisher.publish('test-topic', { data: { foo: 'bar' } } as any)
      ).rejects.toThrow('SNS Error');
    });
  });
});

describe('isSelfPublishingEnabled', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should return true when ENABLE_SELF_PUBLISHING is "true"', () => {
    process.env.ENABLE_SELF_PUBLISHING = 'true';
    expect(isSelfPublishingEnabled()).toBe(true);
  });

  it('should return false when ENABLE_SELF_PUBLISHING is not "true"', () => {
    process.env.ENABLE_SELF_PUBLISHING = 'false';
    expect(isSelfPublishingEnabled()).toBe(false);

    delete process.env.ENABLE_SELF_PUBLISHING;
    expect(isSelfPublishingEnabled()).toBe(false);

    process.env.ENABLE_SELF_PUBLISHING = 'anything-else';
    expect(isSelfPublishingEnabled()).toBe(false);
  });
});
