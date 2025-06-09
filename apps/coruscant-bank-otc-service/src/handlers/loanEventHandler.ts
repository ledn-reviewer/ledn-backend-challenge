import { v4 as uuidv4 } from 'uuid';
import { SQSMessageHandler } from '../services/sqs/consumer';
import { EventHistoryStore } from '../utils/event-store';
import logger from '../utils/logger';

/**
 * In-memory store for received loan events
 */
interface LoanEvent {
  eventType: string;
  requestId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export class LoanEventStore {
  private static instance: LoanEventStore;
  private events: LoanEvent[] = [];

  private constructor() {}

  public static getInstance(): LoanEventStore {
    if (!LoanEventStore.instance) {
      LoanEventStore.instance = new LoanEventStore();
    }
    return LoanEventStore.instance;
  }

  public addEvent(event: LoanEvent): void {
    this.events.push(event);
    logger.info(
      { eventType: event.eventType, requestId: event.requestId },
      'Event added to loan event store'
    );
  }

  public getEvents(): LoanEvent[] {
    return [...this.events];
  }

  public getEventByRequestId(requestId: string): LoanEvent | undefined {
    return this.events.find(event => event.requestId === requestId);
  }
}

/**
 * Loan event handler for SQS messages
 */
export class LoanEventHandler implements SQSMessageHandler {
  private eventStore: LoanEventStore;
  private eventHistoryStore: EventHistoryStore;

  constructor() {
    this.eventStore = LoanEventStore.getInstance();
    this.eventHistoryStore = EventHistoryStore.getInstance({
      maxInMemoryEvents: parseInt(process.env.MAX_IN_MEMORY_EVENTS || '1000')
    });
  }

  public async handleMessage(messageBody: string): Promise<void> {
    try {
      const message = JSON.parse(messageBody);
      logger.debug({ message }, 'Received loan event message');

      // For SNS messages, the actual payload is in the Message property
      let event: LoanEvent;
      if (message.Type === 'Notification') {
        event = JSON.parse(message.Message);
      } else {
        event = message;
      }

      // Store the event in the loan event store
      this.eventStore.addEvent(event);

      // Also add to the event history store
      const eventId = uuidv4();
      this.eventHistoryStore.addEvent({
        id: eventId,
        type: event.eventType,
        direction: 'INBOUND',
        data: event,
        timestamp: new Date().toISOString()
      });

      logger.info(
        { eventType: event.eventType, requestId: event.requestId, eventId },
        'Processed incoming event'
      );

      // Process based on event type
      switch (event.eventType) {
        case 'LOAN_APPLICATION':
          await this.processLoanApplication(event);
          break;
        case 'COLLATERAL_TOP_UP':
          await this.processCollateralTopUp(event);
          break;
        default:
          logger.warn({ eventType: event.eventType }, 'Unknown event type');
      }
    } catch (error) {
      logger.error({ error }, 'Error processing message');
      throw error;
    }
  }

  private async processLoanApplication(event: LoanEvent): Promise<void> {
    logger.info({ requestId: event.requestId }, 'Processing loan application');
    
    try {
      // Extract loan application data from the event
      const { loanId, borrowerId, amount } = event.data as {
        loanId: string;
        borrowerId: string;
        amount: string;
      };

      // Log the loan application details
      logger.info(
        { 
          requestId: event.requestId,
          loanId,
          borrowerId,
          amount 
        }, 
        'Loan application received'
      );

      // Here we could:
      // 1. Validate the loan application
      // 2. Update internal loan tracking
      // 3. Send notifications or responses
      // 4. Trigger business logic (e.g., risk assessment, activation)
      
      // For now, we'll just log successful processing
      logger.info(
        { requestId: event.requestId, loanId },
        'Loan application processed successfully'
      );
    } catch (error) {
      logger.error(
        { 
          requestId: event.requestId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        },
        'Failed to process loan application'
      );
      throw error;
    }
  }

  private async processCollateralTopUp(event: LoanEvent): Promise<void> {
    logger.info({ requestId: event.requestId }, 'Processing collateral top-up');
    
    try {
      // Extract collateral top-up data from the event
      const { loanId, borrowerId, amount } = event.data as {
        loanId: string;
        borrowerId: string;
        amount: string;
      };

      // Log the collateral top-up details
      logger.info(
        { 
          requestId: event.requestId,
          loanId,
          borrowerId,
          amount 
        }, 
        'Collateral top-up received'
      );

      // Here we could:
      // 1. Validate the collateral top-up request
      // 2. Update loan collateral tracking
      // 3. Recalculate loan-to-value (LTV) ratio
      // 4. Check if loan needs to be activated or moved out of liquidation risk
      // 5. Send notifications or responses
      
      // For now, we'll just log successful processing
      logger.info(
        { requestId: event.requestId, loanId },
        'Collateral top-up processed successfully'
      );
    } catch (error) {
      logger.error(
        { 
          requestId: event.requestId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        },
        'Failed to process collateral top-up'
      );
      throw error;
    }
  }
}
