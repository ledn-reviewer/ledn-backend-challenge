import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { receiveAndProcessMessages, SQSMessageHandler } from './consumer';
import { sqsClient } from '../../factories/sqsClient';
import { LOAN_QUEUE_URL } from '../../helpers/aws';
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('../../factories/sqsClient', () => ({
  sqsClient: {
    send: jest.fn()
  }
}));

jest.mock('../../helpers/aws', () => ({
  LOAN_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123456789/test-loan-queue'
}));

jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const mockedSqsClient = sqsClient as unknown as { send: jest.Mock };

describe('SQS Consumer', () => {
  let mockMessageHandler: jest.Mocked<SQSMessageHandler>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockMessageHandler = {
      handleMessage: jest.fn()
    };
  });

  describe('receiveAndProcessMessages', () => {
    it('should successfully process messages from SQS queue', async () => {
      const mockMessages = [
        {
          Body: JSON.stringify({ eventType: 'LOAN_APPLICATION', loanId: 'loan-1' }),
          ReceiptHandle: 'receipt-1',
          MessageId: 'msg-1'
        },
        {
          Body: JSON.stringify({ eventType: 'COLLATERAL_TOP_UP', loanId: 'loan-2' }),
          ReceiptHandle: 'receipt-2',
          MessageId: 'msg-2'
        }
      ];

      mockedSqsClient.send
        .mockResolvedValueOnce({ Messages: mockMessages }) // ReceiveMessageCommand
        .mockResolvedValueOnce({}) // DeleteMessageCommand for msg-1
        .mockResolvedValueOnce({}); // DeleteMessageCommand for msg-2

      mockMessageHandler.handleMessage.mockResolvedValue();

      await receiveAndProcessMessages(mockMessageHandler);

      // Verify ReceiveMessageCommand was sent
      expect(mockedSqsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            QueueUrl: LOAN_QUEUE_URL,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
            AttributeNames: ['All'],
            MessageAttributeNames: ['All']
          }
        })
      );

      // Verify messages were processed
      expect(mockMessageHandler.handleMessage).toHaveBeenCalledTimes(2);
      expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(mockMessages[0].Body);
      expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(mockMessages[1].Body);

      // Verify DeleteMessageCommand was sent for each message
      expect(mockedSqsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            QueueUrl: LOAN_QUEUE_URL,
            ReceiptHandle: 'receipt-1'
          }
        })
      );
      expect(mockedSqsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            QueueUrl: LOAN_QUEUE_URL,
            ReceiptHandle: 'receipt-2'
          }
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        { messageCount: 2 },
        'Received messages from SQS queue'
      );
      expect(logger.info).toHaveBeenCalledWith(
        { messageId: 'msg-1' },
        'Message processed and deleted'
      );
      expect(logger.info).toHaveBeenCalledWith(
        { messageId: 'msg-2' },
        'Message processed and deleted'
      );
    });

    it('should handle empty message queue gracefully', async () => {
      mockedSqsClient.send.mockResolvedValue({ Messages: [] });

      await receiveAndProcessMessages(mockMessageHandler);

      expect(logger.debug).toHaveBeenCalledWith('No messages received from SQS queue');
      expect(mockMessageHandler.handleMessage).not.toHaveBeenCalled();
    });

    it('should handle queue response with no Messages property', async () => {
      mockedSqsClient.send.mockResolvedValue({});

      await receiveAndProcessMessages(mockMessageHandler);

      expect(logger.debug).toHaveBeenCalledWith('No messages received from SQS queue');
      expect(mockMessageHandler.handleMessage).not.toHaveBeenCalled();
    });

    it('should accept custom maxMessages and waitTimeSeconds parameters', async () => {
      mockedSqsClient.send.mockResolvedValue({ Messages: [] });

      await receiveAndProcessMessages(mockMessageHandler, 5, 10);

      expect(mockedSqsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            QueueUrl: LOAN_QUEUE_URL,
            MaxNumberOfMessages: 5,
            WaitTimeSeconds: 10,
            AttributeNames: ['All'],
            MessageAttributeNames: ['All']
          }
        })
      );
    });

    it('should skip messages without body', async () => {
      const mockMessages = [
        {
          ReceiptHandle: 'receipt-1',
          MessageId: 'msg-1'
          // No Body property
        },
        {
          Body: JSON.stringify({ eventType: 'LOAN_APPLICATION' }),
          ReceiptHandle: 'receipt-2',
          MessageId: 'msg-2'
        }
      ];

      mockedSqsClient.send
        .mockResolvedValueOnce({ Messages: mockMessages })
        .mockResolvedValueOnce({}); // DeleteMessageCommand for msg-2 only

      mockMessageHandler.handleMessage.mockResolvedValue();

      await receiveAndProcessMessages(mockMessageHandler);

      expect(logger.warn).toHaveBeenCalledWith('Received message without body or receipt handle');
      expect(mockMessageHandler.handleMessage).toHaveBeenCalledTimes(1);
      expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(mockMessages[1].Body);
    });

    it('should skip messages without receipt handle', async () => {
      const mockMessages = [
        {
          Body: JSON.stringify({ eventType: 'LOAN_APPLICATION' }),
          MessageId: 'msg-1'
          // No ReceiptHandle property
        },
        {
          Body: JSON.stringify({ eventType: 'COLLATERAL_TOP_UP' }),
          ReceiptHandle: 'receipt-2',
          MessageId: 'msg-2'
        }
      ];

      mockedSqsClient.send
        .mockResolvedValueOnce({ Messages: mockMessages })
        .mockResolvedValueOnce({}); // DeleteMessageCommand for msg-2 only

      mockMessageHandler.handleMessage.mockResolvedValue();

      await receiveAndProcessMessages(mockMessageHandler);

      expect(logger.warn).toHaveBeenCalledWith('Received message without body or receipt handle');
      expect(mockMessageHandler.handleMessage).toHaveBeenCalledTimes(1);
      expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(mockMessages[1].Body);
    });

    it('should handle message processing errors without deleting message', async () => {
      const mockMessages = [
        {
          Body: JSON.stringify({ eventType: 'LOAN_APPLICATION' }),
          ReceiptHandle: 'receipt-1',
          MessageId: 'msg-1'
        }
      ];

      const processingError = new Error('Message processing failed');
      mockedSqsClient.send.mockResolvedValueOnce({ Messages: mockMessages });
      mockMessageHandler.handleMessage.mockRejectedValue(processingError);

      await receiveAndProcessMessages(mockMessageHandler);

      expect(logger.error).toHaveBeenCalledWith(
        { error: processingError, messageId: 'msg-1' },
        'Error processing message'
      );

      // Should not call DeleteMessageCommand when processing fails
      expect(mockedSqsClient.send).toHaveBeenCalledTimes(1); // Only ReceiveMessageCommand
    });

    it('should handle delete message errors gracefully', async () => {
      const mockMessages = [
        {
          Body: JSON.stringify({ eventType: 'LOAN_APPLICATION' }),
          ReceiptHandle: 'receipt-1',
          MessageId: 'msg-1'
        }
      ];

      const deleteError = new Error('Delete message failed');
      mockedSqsClient.send
        .mockResolvedValueOnce({ Messages: mockMessages })
        .mockRejectedValueOnce(deleteError);

      mockMessageHandler.handleMessage.mockResolvedValue();

      await receiveAndProcessMessages(mockMessageHandler);

      expect(logger.error).toHaveBeenCalledWith(
        { error: deleteError, messageId: 'msg-1' },
        'Error processing message'
      );
    });

    it('should handle SQS receive errors and rethrow them', async () => {
      const sqsError = new Error('SQS receive failed');
      mockedSqsClient.send.mockRejectedValue(sqsError);

      await expect(receiveAndProcessMessages(mockMessageHandler)).rejects.toThrow(sqsError);

      expect(logger.error).toHaveBeenCalledWith(
        { error: sqsError },
        'Error receiving messages from SQS'
      );
    });

    it('should process multiple messages in parallel', async () => {
      const mockMessages = [
        {
          Body: JSON.stringify({ eventType: 'LOAN_APPLICATION', loanId: 'loan-1' }),
          ReceiptHandle: 'receipt-1',
          MessageId: 'msg-1'
        },
        {
          Body: JSON.stringify({ eventType: 'COLLATERAL_TOP_UP', loanId: 'loan-2' }),
          ReceiptHandle: 'receipt-2',
          MessageId: 'msg-2'
        },
        {
          Body: JSON.stringify({ eventType: 'LOAN_APPLICATION', loanId: 'loan-3' }),
          ReceiptHandle: 'receipt-3',
          MessageId: 'msg-3'
        }
      ];

      const processingOrder: string[] = [];
      mockMessageHandler.handleMessage.mockImplementation(async (body: string) => {
        const message = JSON.parse(body);
        processingOrder.push(message.loanId);
        // Simulate different processing times
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      });

      mockedSqsClient.send
        .mockResolvedValueOnce({ Messages: mockMessages })
        .mockResolvedValue({}); // All delete commands succeed

      await receiveAndProcessMessages(mockMessageHandler);

      expect(mockMessageHandler.handleMessage).toHaveBeenCalledTimes(3);
      expect(processingOrder).toContain('loan-1');
      expect(processingOrder).toContain('loan-2');
      expect(processingOrder).toContain('loan-3');
    });

    it('should handle mixed success and failure scenarios', async () => {
      const mockMessages = [
        {
          Body: JSON.stringify({ eventType: 'LOAN_APPLICATION', loanId: 'loan-1' }),
          ReceiptHandle: 'receipt-1',
          MessageId: 'msg-1'
        },
        {
          Body: JSON.stringify({ eventType: 'COLLATERAL_TOP_UP', loanId: 'loan-2' }),
          ReceiptHandle: 'receipt-2',
          MessageId: 'msg-2'
        }
      ];

      mockMessageHandler.handleMessage
        .mockResolvedValueOnce() // First message succeeds
        .mockRejectedValueOnce(new Error('Processing failed')); // Second message fails

      mockedSqsClient.send
        .mockResolvedValueOnce({ Messages: mockMessages })
        .mockResolvedValueOnce({}); // Delete command for successful message

      await receiveAndProcessMessages(mockMessageHandler);

      // Should log success for first message
      expect(logger.info).toHaveBeenCalledWith(
        { messageId: 'msg-1' },
        'Message processed and deleted'
      );

      // Should log error for second message
      expect(logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error), messageId: 'msg-2' },
        'Error processing message'
      );
    });

    it('should use correct SQS command instances', async () => {
      const mockMessages = [
        {
          Body: JSON.stringify({ eventType: 'LOAN_APPLICATION' }),
          ReceiptHandle: 'receipt-1',
          MessageId: 'msg-1'
        }
      ];

      mockedSqsClient.send
        .mockResolvedValueOnce({ Messages: mockMessages })
        .mockResolvedValueOnce({});

      mockMessageHandler.handleMessage.mockResolvedValue();

      await receiveAndProcessMessages(mockMessageHandler);

      // Check that correct command types were used
      const calls = mockedSqsClient.send.mock.calls;
      expect(calls[0][0]).toBeInstanceOf(ReceiveMessageCommand);
      expect(calls[1][0]).toBeInstanceOf(DeleteMessageCommand);
    });

    it('should handle complex message bodies with special characters', async () => {
      const complexBody = JSON.stringify({
        eventType: 'LOAN_APPLICATION',
        data: {
          borrowerId: 'user@example.com',
          amount: '1,000.50',
          currency: '€',
          notes: 'Special chars: äöü ñ 中文'
        }
      });

      const mockMessages = [
        {
          Body: complexBody,
          ReceiptHandle: 'receipt-1',
          MessageId: 'msg-1'
        }
      ];

      mockedSqsClient.send
        .mockResolvedValueOnce({ Messages: mockMessages })
        .mockResolvedValueOnce({});

      mockMessageHandler.handleMessage.mockResolvedValue();

      await receiveAndProcessMessages(mockMessageHandler);

      expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(complexBody);
    });

    it('should handle edge case with undefined message body', async () => {
      const mockMessages = [
        {
          Body: undefined,
          ReceiptHandle: 'receipt-1',
          MessageId: 'msg-1'
        }
      ];

      mockedSqsClient.send.mockResolvedValueOnce({ Messages: mockMessages });

      await receiveAndProcessMessages(mockMessageHandler);

      expect(logger.warn).toHaveBeenCalledWith('Received message without body or receipt handle');
      expect(mockMessageHandler.handleMessage).not.toHaveBeenCalled();
    });

    it('should handle edge case with undefined receipt handle', async () => {
      const mockMessages = [
        {
          Body: JSON.stringify({ eventType: 'LOAN_APPLICATION' }),
          ReceiptHandle: undefined,
          MessageId: 'msg-1'
        }
      ];

      mockedSqsClient.send.mockResolvedValueOnce({ Messages: mockMessages });

      await receiveAndProcessMessages(mockMessageHandler);

      expect(logger.warn).toHaveBeenCalledWith('Received message without body or receipt handle');
      expect(mockMessageHandler.handleMessage).not.toHaveBeenCalled();
    });
  });

  describe('SQSMessageHandler interface', () => {
    it('should define correct interface structure', () => {
      const handler: SQSMessageHandler = {
        handleMessage: jest.fn()
      };

      expect(handler.handleMessage).toBeDefined();
      expect(typeof handler.handleMessage).toBe('function');
    });
  });
});