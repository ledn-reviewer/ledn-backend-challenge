import { EventPublisher } from '../../application/interfaces/event-publisher';
import { DomainEvent } from '../../domain/events/domain-event';
import { SnsPublisher } from './sns-publisher';
import logger from '../../utils/logger';

export class SnsEventPublisher implements EventPublisher {
  constructor(private readonly snsPublisher: SnsPublisher) {}

  public async publish(event: DomainEvent): Promise<void> {
    try {
      await this.snsPublisher.publish(event);
      
      logger.info({
        eventId: event.eventId,
        eventType: event.eventType
      }, 'Domain event published to SNS');
    } catch (error) {
      logger.error({ error, eventType: event.eventType }, 'Failed to publish domain event');
      throw error;
    }
  }

  public async publishBatch(events: DomainEvent[]): Promise<void> {
    const publishPromises = events.map(event => this.publish(event));
    await Promise.all(publishPromises);
  }
}