import {
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ReceiveMessageCommandOutput
} from '@aws-sdk/client-sqs';
import { sqsClient } from '../../factories/sqsClient';
import { LOAN_QUEUE_URL } from '../../helpers/aws';
import logger from '../../utils/logger';

/**
 * Interface for SQS message handler
 */
export interface SQSMessageHandler {
  handleMessage: (messageBody: string) => Promise<void>;
}

/**
 * Process messages from the SQS queue
 */
export const receiveAndProcessMessages = async (
  messageHandler: SQSMessageHandler,
  maxMessages = 10,
  waitTimeSeconds = 20
): Promise<void> => {
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: LOAN_QUEUE_URL,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTimeSeconds,
      AttributeNames: ['All'],
      MessageAttributeNames: ['All']
    });

    const response: ReceiveMessageCommandOutput = await sqsClient.send(command);
    const messages = response.Messages || [];

    if (messages.length === 0) {
      logger.debug('No messages received from SQS queue');
      return;
    }

    logger.info({ messageCount: messages.length }, 'Received messages from SQS queue');

    // Process messages in parallel
    await Promise.all(messages.map(async (message) => {
      if (!message.Body || !message.ReceiptHandle) {
        logger.warn('Received message without body or receipt handle');
        return;
      }

      try {
        // Handle the message
        await messageHandler.handleMessage(message.Body);

        // Delete the message after successful processing
        const deleteCommand = new DeleteMessageCommand({
          QueueUrl: LOAN_QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle
        });

        await sqsClient.send(deleteCommand);
        logger.info({ messageId: message.MessageId }, 'Message processed and deleted');
      } catch (error) {
        logger.error({ error, messageId: message.MessageId }, 'Error processing message');
        // Message will be available again after visibility timeout
      }
    }));
  } catch (error) {
    logger.error({ error }, 'Error receiving messages from SQS');
    throw error;
  }
};
