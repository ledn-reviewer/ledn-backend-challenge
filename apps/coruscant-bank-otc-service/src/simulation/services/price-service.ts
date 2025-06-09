import { AssetPrice, PriceService } from '../models/types';
import { SNSSubscriberClient, snsSubscriberClient } from '../../services/sns/subscriber-client';
import logger from '../../utils/logger';

/**
 * Service that subscribes to SNS topics for price updates
 */
export class PriceSubscriber implements PriceService {
  private cachedPrice: number;
  private priceTimestamp: Date;
  private readonly tatooineTopicName = 'tatooine-mos-espa-prices';
  private readonly batuuTopicName = 'batuu-black-spire-outpost-price-stream';
  private subscriber: SNSSubscriberClient;

  /**
   * Create a new price subscriber that listens to SNS price topics
   * @param subscriber The SNS subscriber client to use (dependency injection)
   */
  constructor(subscriber?: SNSSubscriberClient) {
    this.cachedPrice = 50; // Default initial price if no message received yet
    this.priceTimestamp = new Date();
    this.subscriber = subscriber || snsSubscriberClient; // Use provided subscriber or fallback to singleton
    this.subscribeToTopics();
  }

  /**
   * Subscribe to price topics
   */
  private async subscribeToTopics(): Promise<void> {
    try {
      // Subscribe to Tatooine market prices
      await this.subscriber.subscribe(this.tatooineTopicName, (message) => {
        if (message && typeof message.price === 'number') {
          this.cachedPrice = message.price;
          this.priceTimestamp = new Date(message.timestamp || Date.now());
          logger.debug({ source: 'tatooine', price: message.price }, 'Updated price from SNS');
        }
      });

      // Subscribe to Batuu market prices
      await this.subscriber.subscribe(this.batuuTopicName, (message) => {
        if (message && typeof message.price === 'number') {
          this.cachedPrice = message.price;
          this.priceTimestamp = new Date(message.timestamp || Date.now());
          logger.debug({ source: 'batuu', price: message.price }, 'Updated price from SNS');
        }
      });

      logger.info('Subscribed to price topics');
    } catch (error) {
      logger.error({ error }, 'Failed to subscribe to price topics');
    }
  }

  /**
   * Get the current asset price from SNS topics
   * @returns The most recent price from any subscribed topic
   */
  public async getCurrentPrice(): Promise<AssetPrice> {
    // Check for latest message from Tatooine
    const tatooineMessage = this.subscriber.getLatestMessage(this.tatooineTopicName);
    if (tatooineMessage && typeof tatooineMessage.price === 'number') {
      const timestamp = tatooineMessage.timestamp ? new Date(tatooineMessage.timestamp) : new Date();
      // Use Tatooine price if it's newer than our cached price
      if (timestamp > this.priceTimestamp) {
        this.cachedPrice = tatooineMessage.price;
        this.priceTimestamp = timestamp;
      }
    }

    // Check for latest message from Batuu
    const batuuMessage = this.subscriber.getLatestMessage(this.batuuTopicName);
    if (batuuMessage && typeof batuuMessage.price === 'number') {
      const timestamp = batuuMessage.timestamp ? new Date(batuuMessage.timestamp) : new Date();
      // Use Batuu price if it's newer than our cached price
      if (timestamp > this.priceTimestamp) {
        this.cachedPrice = batuuMessage.price;
        this.priceTimestamp = timestamp;
      }
    }

    return {
      price: this.cachedPrice,
      timestamp: this.priceTimestamp
    };
  }
}
