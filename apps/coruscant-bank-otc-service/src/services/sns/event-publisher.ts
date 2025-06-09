import { v4 as uuidv4 } from 'uuid';
import { LOAN_EVENTS_TOPIC_ARN } from '../../helpers/aws';
import { EventHistoryStore } from '../../utils/event-store';
import logger from '../../utils/logger';
import { SNSPublisher } from './publisher';
import { LoanEventMessage } from './event-publisher.types';
import { isSelfPublishingEnabled } from '../../config/aws';

/**
 * Service for publishing events to SNS topics with history tracking
 */
export class EventPublisher {
  private snsPublisher: SNSPublisher;
  private eventStore: EventHistoryStore;

  constructor() {
    this.snsPublisher = new SNSPublisher();
    this.eventStore = EventHistoryStore.getInstance();
  }

  /**
   * Publish an event to SNS and track it in the event history
   */
  public async publishEvent(message: LoanEventMessage): Promise<string> {
    const eventId = uuidv4();

    try {
      // Always log and record the event, even if we don't publish it
      logger.info({ message, selfPublishingEnabled: isSelfPublishingEnabled() }, 'Processing outbound message');

      // Record the outbound event before attempting to send
      this.eventStore.addEvent({
        id: eventId,
        type: message.eventType,
        direction: 'OUTBOUND',
        data: message,
        timestamp: new Date().toISOString()
      });

      // Skip publishing if self-publishing is enabled (fake liquidation service will handle it)
      if (isSelfPublishingEnabled()) {
        logger.info({
          requestId: message.requestId,
          eventType: message.eventType
        }, 'Self-publishing enabled, skipping SNS publish (fake liquidation service will handle)');
        return eventId; // Return the event ID as a pseudo-message ID
      }

      // Extract topic name from ARN
      const topicName = LOAN_EVENTS_TOPIC_ARN.split(':').pop() || '';

      // Publish to SNS - no retries, just a single attempt
      const messageId = await this.snsPublisher.publish(topicName, message);

      logger.info({
        messageId,
        requestId: message.requestId,
        eventType: message.eventType
      }, 'Message published to SNS topic');

      return messageId;
    } catch (error) {
      logger.error({ error, message }, 'Error publishing message to SNS');
      throw error;
    }
  }
}
