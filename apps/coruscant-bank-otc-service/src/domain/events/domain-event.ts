import { RequestId } from '../value-objects/request-id';

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly requestId: RequestId;
  public readonly occurredOn: Date;
  public readonly eventType: string;

  protected constructor(requestId: RequestId, eventType: string) {
    this.eventId = RequestId.generate().getValue();
    this.requestId = requestId;
    this.occurredOn = new Date();
    this.eventType = eventType;
  }

  public abstract toPrimitives(): Record<string, unknown>;
}