import { PublishCommand } from '@aws-sdk/client-sns';
import { v4 as uuidv4 } from 'uuid';
import { snsClient } from '../../factories/snsClient';
import { LOAN_EVENTS_TOPIC_ARN } from '../../helpers/aws';
import { EventHistoryStore } from '../../utils/event-store';
import { withRetry } from '../../utils/retry';
import logger from '../../utils/logger';

/**
 * Interface for loan event message
 */
export interface LoanEventMessage {
  eventType: 'LOAN_APPLICATION' | 'COLLATERAL_TOP_UP';
  requestId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Check if self-publishing of events is enabled via environment variable
 */
export const isSelfPublishingEnabled = (): boolean => {
  const enabled = process.env.ENABLE_SELF_PUBLISHING === 'true';
  return enabled;
};

/**
 * Publish a message to the SNS topic with retries
 */
export const publishLoanEvent = async (message: LoanEventMessage): Promise<string> => {
  const eventStore = EventHistoryStore.getInstance();

  const eventId = uuidv4();

  try {
    // Always log and record the event, even if we don't publish it
    logger.info({ message, selfPublishingEnabled: isSelfPublishingEnabled() }, 'Processing outbound message');

    // Record the outbound event before attempting to send
    eventStore.addEvent({
      id: eventId,
      type: message.eventType,
      direction: 'OUTBOUND',
      data: message,
      timestamp: new Date().toISOString()
    });

    // Skip publishing if self-publishing is disabled
    if (!isSelfPublishingEnabled()) {
      logger.info({
        requestId: message.requestId,
        eventType: message.eventType
      }, 'Self-publishing disabled, skipping SNS publish');
      return eventId; // Return the event ID as a pseudo-message ID
    }

    const messageId = await withRetry(async () => {
      const command = new PublishCommand({
        TopicArn: LOAN_EVENTS_TOPIC_ARN,
        Message: JSON.stringify(message),
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: message.eventType
          }
        }
      });

      const response = await snsClient.send(command);
      return response.MessageId || '';
    }, {
      maxAttempts: 5,
      initialDelayMs: 200,
    });

    logger.info({
      messageId,
      requestId: message.requestId,
      eventType: message.eventType
    }, 'Message published to SNS topic');

    return messageId;
  } catch (error) {
    logger.error({ error, message }, 'Error publishing message to SNS after retries');
    throw error;
  }
};
