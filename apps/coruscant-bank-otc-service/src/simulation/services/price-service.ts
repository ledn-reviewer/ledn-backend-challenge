import axios from 'axios';
import { AssetPrice, PriceService } from '../models/types';
import logger from '../../utils/logger';

/**
 * Simple price service that simulates asset price fluctuation
 */
export class SimplePriceService implements PriceService {
  private basePrice: number;
  private volatility: number;
  private priceApiEndpoint?: string;

  /**
   * Create a new price service
   * @param basePrice The base price for the asset
   * @param volatility Price volatility factor (0-1)
   * @param priceApiEndpoint Optional external API endpoint for price data
   */
  constructor(basePrice: number = 10000, volatility: number = 0.05, priceApiEndpoint?: string) {
    this.basePrice = basePrice;
    this.volatility = volatility;
    this.priceApiEndpoint = priceApiEndpoint;
  }

  /**
   * Get the current asset price
   * If an API endpoint is configured, it will attempt to fetch from there first
   * Otherwise, it simulates price movement
   */
  public async getCurrentPrice(): Promise<AssetPrice> {
    // Try to fetch from external API if configured
    if (this.priceApiEndpoint) {
      try {
        const response = await axios.get(this.priceApiEndpoint);

        // Parse API response assuming it has a price field
        if (response.data && response.data.price) {
          return {
            price: parseFloat(response.data.price),
            timestamp: new Date()
          };
        }
      } catch (error) {
        logger.warn({ error }, 'Failed to fetch price from API, using simulated price instead');
      }
    }

    // Simulate price movement using random walk
    const randomFactor = 1 + (Math.random() * this.volatility * 2 - this.volatility);
    const simulatedPrice = this.basePrice * randomFactor;

    return {
      price: simulatedPrice,
      timestamp: new Date()
    };
  }

  /**
   * Set a new base price
   * @param newBasePrice The new base price
   */
  public setBasePrice(newBasePrice: number): void {
    this.basePrice = newBasePrice;
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
}
