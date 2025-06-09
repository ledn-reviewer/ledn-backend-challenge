import { EventPublisher } from '../../application/interfaces/event-publisher';
import { DomainEvent } from '../../domain/events/domain-event';
import { SNSPublisher } from '../../services/sns/publisher';
import { LOAN_EVENTS_TOPIC_ARN } from '../../helpers/aws';
import logger from '../../utils/logger';

export class SnsEventPublisher implements EventPublisher {
  constructor(private readonly snsPublisher: SNSPublisher) {}

  public async publish(event: DomainEvent): Promise<void> {
    try {
      const topicName = LOAN_EVENTS_TOPIC_ARN.split(':').pop() || '';
      const messageId = await this.snsPublisher.publish(topicName, event.toPrimitives());
      
      logger.info({
        messageId,
        eventId: event.eventId,
        eventType: event.eventType
      }, 'Domain event published to SNS');
    } catch (error) {
      logger.error({ error, event: event.toPrimitives() }, 'Failed to publish domain event');
      throw error;
    }
  }

  public async publishBatch(events: DomainEvent[]): Promise<void> {
    const publishPromises = events.map(event => this.publish(event));
    await Promise.all(publishPromises);
  }
}