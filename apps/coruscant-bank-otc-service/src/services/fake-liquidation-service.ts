import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { SNSPublisher } from './sns/publisher';
import logger from '../utils/logger';

interface Loan {
  loanId: string;
  borrowerId: string;
  amount: number;
  collateral: number;
  loanTimestamp: Date;
  ltv: number;
  status: 'pending' | 'active' | 'liquidated';
}

interface PriceData {
  price: number;
  timestamp: string;
  market: string;
}

/**
 * Fake liquidation service that simulates loan lifecycle management
 * for testing purposes. Publishes loan events based on price changes.
 */
export class FakeLiquidationService {
  private loans: Map<string, Loan> = new Map();
  private currentPrice: number = 50; // Starting price for Beskar
  private snsPublisher: SNSPublisher;
  private events: EventEmitter;
  private priceUpdateInterval?: NodeJS.Timeout;
  private loanProcessingInterval?: NodeJS.Timeout;

  constructor() {
    this.snsPublisher = new SNSPublisher();
    this.events = new EventEmitter();
    this.setupPriceSubscription();
  }

  /**
   * Start the fake liquidation service
   */
  public start(): void {
    logger.info('Starting fake liquidation service');
    
    // Start price updates every 30 seconds
    this.priceUpdateInterval = setInterval(() => {
      this.updatePrice();
    }, 30000);

    // Process loans every 10 seconds
    this.loanProcessingInterval = setInterval(() => {
      this.processLoans();
    }, 10000);
  }

  /**
   * Stop the fake liquidation service
   */
  public stop(): void {
    logger.info('Stopping fake liquidation service');
    
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }
    
    if (this.loanProcessingInterval) {
      clearInterval(this.loanProcessingInterval);
    }
  }

  /**
   * Add a loan for processing
   */
  public addLoan(loanData: {
    loanId: string;
    borrowerId: string;
    amount: number;
    collateral: number;
  }): void {
    const loan: Loan = {
      ...loanData,
      loanTimestamp: new Date(),
      ltv: this.calculateLTV(loanData.collateral, loanData.amount),
      status: 'pending'
    };

    this.loans.set(loan.loanId, loan);
    
    logger.info(
      { 
        loanId: loan.loanId, 
        borrowerId: loan.borrowerId,
        amount: loan.amount,
        collateral: loan.collateral,
        ltv: loan.ltv 
      },
      'Added loan to fake liquidation service'
    );

    // Publish loan application event
    this.publishLoanApplicationEvent(loan);
  }

  /**
   * Update collateral for a loan
   */
  public updateCollateral(loanId: string, additionalCollateral: number): void {
    const loan = this.loans.get(loanId);
    if (!loan) {
      logger.warn({ loanId }, 'Loan not found for collateral update');
      return;
    }

    loan.collateral += additionalCollateral;
    loan.ltv = this.calculateLTV(loan.collateral, loan.amount);
    
    logger.info(
      { 
        loanId, 
        additionalCollateral, 
        totalCollateral: loan.collateral, 
        newLtv: loan.ltv 
      },
      'Updated loan collateral'
    );
  }

  /**
   * Setup price subscription from external price feeds
   */
  private setupPriceSubscription(): void {
    // In a real implementation, this would subscribe to price feeds
    // For now, we'll just simulate price updates
  }

  /**
   * Update the current Beskar price
   */
  private updatePrice(): void {
    // Simulate price volatility (±5% change)
    const change = (Math.random() - 0.5) * 0.1; // ±5%
    this.currentPrice = Math.max(10, this.currentPrice * (1 + change));
    
    logger.debug({ price: this.currentPrice }, 'Updated Beskar price');
    
    // Recalculate LTV for all loans
    this.recalculateLTVs();
  }

  /**
   * Recalculate LTV for all loans based on current price
   */
  private recalculateLTVs(): void {
    for (const loan of this.loans.values()) {
      loan.ltv = this.calculateLTV(loan.collateral, loan.amount);
    }
  }

  /**
   * Calculate Loan-to-Value ratio
   */
  private calculateLTV(collateral: number, loanAmount: number): number {
    if (loanAmount === 0) return 0;
    return (collateral * this.currentPrice) / loanAmount;
  }

  /**
   * Process all loans for activation and liquidation
   */
  private processLoans(): void {
    for (const loan of this.loans.values()) {
      this.processLoan(loan);
    }
  }

  /**
   * Process a single loan
   */
  private processLoan(loan: Loan): void {
    const previousStatus = loan.status;

    // Check for activation (LTV <= 50%)
    if (loan.status === 'pending' && loan.ltv <= 0.5) {
      loan.status = 'active';
      this.publishLoanActivationEvent(loan);
      
      logger.info(
        { 
          loanId: loan.loanId, 
          ltv: loan.ltv, 
          price: this.currentPrice 
        },
        'Loan activated'
      );
    }

    // Check for liquidation (LTV >= 80%)
    if (loan.status === 'active' && loan.ltv >= 0.8) {
      loan.status = 'liquidated';
      this.publishLoanLiquidationEvent(loan);
      
      logger.info(
        { 
          loanId: loan.loanId, 
          ltv: loan.ltv, 
          price: this.currentPrice 
        },
        'Loan liquidated'
      );
    }
  }

  /**
   * Publish loan application event
   */
  private async publishLoanApplicationEvent(loan: Loan): Promise<void> {
    const event = {
      eventId: uuidv4(),
      eventType: 'LOAN_APPLICATION',
      requestId: uuidv4(),
      data: {
        loanId: loan.loanId,
        borrowerId: loan.borrowerId,
        amount: loan.amount.toString(),
        collateral: loan.collateral.toString(),
        timestamp: loan.loanTimestamp.toISOString()
      }
    };

    try {
      await this.snsPublisher.publish('coruscant-bank-loan-events', event);
      logger.info({ loanId: loan.loanId }, 'Published loan application event');
    } catch (error) {
      logger.error({ error, loanId: loan.loanId }, 'Failed to publish loan application event');
    }
  }

  /**
   * Publish loan activation event
   */
  private async publishLoanActivationEvent(loan: Loan): Promise<void> {
    const event = {
      eventId: uuidv4(),
      eventType: 'LOAN_ACTIVATION',
      requestId: uuidv4(),
      data: {
        loanId: loan.loanId,
        borrowerId: loan.borrowerId,
        amount: loan.amount.toString(),
        collateral: loan.collateral.toString(),
        ltv: loan.ltv.toString(),
        activationTimestamp: new Date().toISOString()
      }
    };

    try {
      await this.snsPublisher.publish('coruscant-bank-loan-events', event);
      logger.info({ loanId: loan.loanId, ltv: loan.ltv }, 'Published loan activation event');
    } catch (error) {
      logger.error({ error, loanId: loan.loanId }, 'Failed to publish loan activation event');
    }
  }

  /**
   * Publish loan liquidation event
   */
  private async publishLoanLiquidationEvent(loan: Loan): Promise<void> {
    const event = {
      eventId: uuidv4(),
      eventType: 'LOAN_LIQUIDATION',
      requestId: uuidv4(),
      data: {
        loanId: loan.loanId,
        borrowerId: loan.borrowerId,
        amount: loan.amount.toString(),
        collateral: loan.collateral.toString(),
        ltv: loan.ltv.toString(),
        currentPrice: this.currentPrice.toString(),
        liquidationTimestamp: new Date().toISOString()
      }
    };

    try {
      await this.snsPublisher.publish('coruscant-bank-loan-events', event);
      logger.info({ loanId: loan.loanId, ltv: loan.ltv }, 'Published loan liquidation event');
    } catch (error) {
      logger.error({ error, loanId: loan.loanId }, 'Failed to publish loan liquidation event');
    }
  }

  /**
   * Get current service statistics
   */
  public getStatistics(): {
    totalLoans: number;
    pendingLoans: number;
    activeLoans: number;
    liquidatedLoans: number;
    currentPrice: number;
  } {
    const loans = Array.from(this.loans.values());
    
    return {
      totalLoans: loans.length,
      pendingLoans: loans.filter(l => l.status === 'pending').length,
      activeLoans: loans.filter(l => l.status === 'active').length,
      liquidatedLoans: loans.filter(l => l.status === 'liquidated').length,
      currentPrice: this.currentPrice
    };
  }
}