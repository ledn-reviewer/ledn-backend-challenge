import { SNSPublisher } from './sns/publisher';
import logger from '../utils/logger';

/**
 * Price publishing service that publishes Beskar prices to trading markets
 * when ENABLE_SELF_PUBLISHING is enabled
 */
export class PricePublisher {
  private snsPublisher: SNSPublisher;
  private currentPrice: number = 50; // Starting price for Beskar
  private priceUpdateInterval?: NodeJS.Timeout;
  private volatility: number = 0.06; // ±3% change

  /**
   * Create a new price publisher
   * @param publisher Optional SNSPublisher instance for dependency injection
   * @param initialPrice The initial price for Beskar (default: 50)
   * @param volatility Price volatility factor (0-1, default: 0.06)
   */
  constructor(
    publisher: SNSPublisher =  new SNSPublisher(),
    initialPrice: number = 50,
    volatility: number = 0.06
  ) {
    this.snsPublisher = publisher;
    this.currentPrice = initialPrice;
    this.volatility = volatility;
  }

  /**
   * Start publishing prices
   */
  public start(): void {
    logger.info('Starting price publisher service');

    // Publish initial prices
    this.publishPrices();

    // Update and publish prices every second
    this.priceUpdateInterval = setInterval(() => {
      this.updateAndPublishPrices();
    }, 1000);
  }

  /**
   * Stop publishing prices
   */
  public stop(): void {
    logger.info('Stopping price publisher service');

    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }
  }

  /**
   * Update price and publish to all topics
   */
  private updateAndPublishPrices(): void {
    this.updatePrice();
    this.publishPrices();
  }  /**
   * Update the current Beskar price with volatility
   */
  private updatePrice(): void {
    // Simulate price movement using random walk
    const randomFactor = 1 + (Math.random() * this.volatility * 2 - this.volatility);
    this.currentPrice = Math.max(10, this.currentPrice * randomFactor);

    logger.debug({ price: this.currentPrice }, 'Updated Beskar price');
  }

  /**
   * Set the price volatility
   * @param newVolatility The new volatility factor (0-1)
   */
  public setVolatility(newVolatility: number): void {
    if (newVolatility < 0 || newVolatility > 1) {
      throw new Error('Volatility must be between 0 and 1');
    }
    this.volatility = newVolatility;
  }

  /**
   * Publish current price to all market topics
   */
  private async publishPrices(): Promise<void> {
    const timestamp = new Date().toISOString();
    const unixTimestamp = Math.floor(Date.now() / 1000);

    // Generate random price adjustments between -1% and 1% for each market
    const mosEspaAdjustment = (Math.random() * 0.02) - 0.01; // -1% to +1%
    const blackSpireAdjustment = (Math.random() * 0.02) - 0.01; // -1% to +1%

    // Calculate adjusted base prices for each market
    const mosEspaAdjustedPrice = this.currentPrice * (1 + mosEspaAdjustment);
    const blackSpireAdjustedPrice = this.currentPrice * (1 + blackSpireAdjustment);

    // Define quantities/amounts for price levels
    const quantities = [1, 10, 50, 100];
    // Generate price levels for Mos Espa (Tatooine)
    const mosEspaLevels = quantities.map(quantity => {
      const depthFactor = Math.log10(quantity) / 100; // deeper orders move into the book
      const buyPrice = mosEspaAdjustedPrice * (1 + 0.005 + depthFactor);  // price rises for buying
      const sellPrice = mosEspaAdjustedPrice * (1 - 0.005 - depthFactor); // price falls for selling

      return {
        quantity,
        buy: buyPrice.toFixed(2),
        sell: sellPrice.toFixed(2)
      };
    });

    // Generate price levels for Black Spire Outpost (Batuu)
    const blackSpireBuyLevels = quantities.map(amount => {
      const depthFactor = Math.log10(amount) / 120;
      const price = Number((blackSpireAdjustedPrice * (1 + 0.004 + depthFactor)).toFixed(2)); // rises for buy
      return { amount, price };
    });

    const blackSpireSellLevels = quantities.map(amount => {
      const depthFactor = Math.log10(amount) / 120;
      const price = Number((blackSpireAdjustedPrice * (1 - 0.004 - depthFactor)).toFixed(2)); // falls for sell
      return { amount, price };
    });

    // Publish to Mos Espa (Tatooine) market - following README schema while maintaining compatibility with PriceMessage
    const mosEspaPrice = {
      eventId: `price-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      asset: 'BESKAR',
      currency: 'GC',
      timestamp,
      levels: mosEspaLevels,
      // Keep required fields for PriceMessage interface compatibility
      price: mosEspaAdjustedPrice
    };

    // Publish to Black Spire Outpost (Batuu) market - following README schema while maintaining PriceMessage compatibility
    const blackSpirePrice = {
      item: 'BSK',
      time: unixTimestamp,
      buy: blackSpireBuyLevels,
      sell: blackSpireSellLevels,
      // Keep required fields for PriceMessage interface compatibility
      price: blackSpireAdjustedPrice,
      timestamp
    };

    try {
      // Publish to both markets concurrently
      await Promise.all([
        this.snsPublisher.publish('tatooine-mos-espa-prices', mosEspaPrice), // Cast to any to match expected type
        this.snsPublisher.publish('batuu-black-spire-outpost-price-stream', blackSpirePrice)
      ]);

      logger.debug(
        {
          currentPrice: this.currentPrice,
          mosEspaPrice: mosEspaPrice.price,
          blackSpirePrice: blackSpirePrice.price,
          timestamp,
          markets: ['mos-espa', 'black-spire-outpost']
        },
        'Published prices to all markets'
      );
    } catch (error) {
      logger.error({ error, price: this.currentPrice }, 'Failed to publish prices');
    }
  }

  /**
   * Get current price
   */
  public getCurrentPrice(): number {
    return this.currentPrice;
  }

  /**
   * Set price manually (for testing)
   */
  public setPrice(price: number): void {
    this.currentPrice = Math.max(10, price);
    logger.info({ price: this.currentPrice }, 'Price manually set');
  }
}
