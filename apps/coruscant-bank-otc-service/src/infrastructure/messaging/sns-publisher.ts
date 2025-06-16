import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { EventPublisher } from '../../application/interfaces/event-publisher';
import { DomainEvent } from '../../domain/events/domain-event';
import logger from '../../utils/logger';

export class SnsPublisher implements EventPublisher {
  constructor(
    private readonly client: SNSClient,
    private readonly topicArn: string
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    try {
      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify({
          eventType: event.eventType,
          eventId: event.eventId,
          requestId: event.requestId.getValue(),
          occurredOn: event.occurredOn.toISOString(),
          data: event.toPrimitives()
        }),
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: event.eventType
          }
        }
      });

      await this.client.send(command);
      
      logger.info({
        eventType: event.eventType,
        eventId: event.eventId,
        requestId: event.requestId.getValue()
      }, 'Event published successfully');
    } catch (error) {
      logger.error({ error, event: event.eventType }, 'Failed to publish event');
      throw error;
    }
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    const publishPromises = events.map(event => this.publish(event));
    await Promise.all(publishPromises);
  }
}