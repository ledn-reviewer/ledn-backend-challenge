import logger from '../../utils/logger';

/**
 * Message type for prices
 */
export interface PriceMessage {
  price: number;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * SNS Subscriber client for receiving published messages
 */
export class SNSSubscriberClient {
  private messageHandlers: Map<string, (message: PriceMessage) => void>;
  private latestMessages: Map<string, PriceMessage>;

  constructor() {
    this.messageHandlers = new Map();
    this.latestMessages = new Map();
  }

  /**
   * Subscribe to an SNS topic and store messages
   * @param topicName The name of the SNS topic to subscribe to
   * @param handler Optional callback to handle incoming messages
   */
  public async subscribe(topicName: string, handler?: (message: PriceMessage) => void): Promise<void> {
    try {
      // Store the message handler if provided
      if (handler) {
        this.messageHandlers.set(topicName, handler);
      }

      logger.info({ topicName }, 'Subscribed to SNS topic');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error: errorMessage, topicName }, 'Error subscribing to SNS topic');
      throw error;
    }
  }

  /**
   * Process a message received from SNS
   * This would be called by the system when messages are received
   * @param topicName The name of the topic the message is from
   * @param message The message payload
   */
  public processMessage(topicName: string, message: PriceMessage): void {
    try {
      // Store the latest message for this topic
      this.latestMessages.set(topicName, message);

      // Call the handler if one exists
      const handler = this.messageHandlers.get(topicName);
      if (handler) {
        handler(message);
      }

      logger.debug({ topicName }, 'Processed SNS message');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error: errorMessage, topicName }, 'Error processing SNS message');
    }
  }

  /**
   * Get the most recent message from a topic
   * @param topicName The name of the topic
   * @returns The most recent message or undefined if none received
   */
  public getLatestMessage(topicName: string): PriceMessage | undefined {
    return this.latestMessages.get(topicName);
  }
}

// Singleton instance
export const snsSubscriberClient = new SNSSubscriberClient();
