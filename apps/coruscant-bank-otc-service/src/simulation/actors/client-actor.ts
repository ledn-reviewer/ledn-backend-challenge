import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import logger from '../../utils/logger';
import {
  ClientSize,
  CLIENT_SIZE_RANGES,
  ClientActionType,
  ClientState,
  ClientEvents,
  Loan,
  PriceService,
} from '../models/types';

/**
 * Client Actor class implementing the Actor model pattern
 */
export class ClientActor {
  private state: ClientState;
  private events: ClientEvents;
  private priceService: PriceService;
  private actionIntervalId?: NodeJS.Timeout;
  private actionIntervalMs: number;
  private loanApiEndpoint: string;
  private collateralApiEndpoint: string;
  private targetLtv: number;
  private failedActions: Set<string>; // Track failed actions to prevent retries

  /**
   * Create a new client actor
   * @param priceService The price service to fetch current asset prices
   * @param events EventEmitter for actor communication
   * @param actionIntervalMs Interval between actor actions in milliseconds
   * @param apiBaseUrl Base URL for API endpoints
   */
  constructor(
    priceService: PriceService,
    events: ClientEvents,
    actionIntervalMs: number,
    apiBaseUrl: string,
  ) {
    this.priceService = priceService;
    this.events = events;
    this.actionIntervalMs = actionIntervalMs;
    this.loanApiEndpoint = `${apiBaseUrl}/loan-applications`;
    this.collateralApiEndpoint = `${apiBaseUrl}/collateral-top-ups`;

    // Initialize client state with random parameters
    this.state = this.generateRandomClientState();
    this.targetLtv = 0.5; // Default target LTV of 50%
    this.failedActions = new Set(); // Initialize failed actions tracking
  }

  /**
   * Generate a randomized client state
   */
  private generateRandomClientState(): ClientState {
    // Pick a random client size
    const sizeCategories = Object.values(ClientSize);
    const randomSize =
      sizeCategories[Math.floor(Math.random() * sizeCategories.length)];

    // Get BSK range for selected size
    const { min, max } = CLIENT_SIZE_RANGES[randomSize];

    // Calculate max loan amount within range
    const maxLoanAmount = min + Math.random() * (max - min);
    return {
      borrowerId: uuidv4(),
      size: randomSize,
      maxLoanAmount,
      riskTolerance: 0.2 + Math.random() * 0.6, // Random risk tolerance between 0.2 and 0.8
      actionsPerformed: 0,
      loans: new Map<string, Loan>(),
    };
  }

  /**
   * Start the actor's lifecycle
   */
  public start(): void {
    // Emit birth action when actor starts
    this.emitAction(ClientActionType.BIRTH, {
      borrowerId: this.state.borrowerId,
      size: this.state.size,
      maxLoanAmount: this.state.maxLoanAmount,
      riskTolerance: this.state.riskTolerance
    });

    // Start the action interval
    this.actionIntervalId = setInterval(
      () => this.performRandomAction(),
      this.actionIntervalMs,
    );

    // Make sure the interval doesn't keep the process alive
    if (this.actionIntervalId && this.actionIntervalId.unref) {
      this.actionIntervalId.unref();
    }

    logger.debug(
      { borrowerId: this.state.borrowerId, size: this.state.size },
      'Client actor started',
    );
  }

  /**
   * Stop the actor's lifecycle
   */
  public stop(): void {
    if (this.actionIntervalId) {
      clearInterval(this.actionIntervalId);
      this.actionIntervalId = undefined;
    }

    logger.debug({ borrowerId: this.state.borrowerId }, 'Client actor stopped');
  }

  /**
   * Perform a random action based on probabilities
   */
  private async performRandomAction(): Promise<void> {
    try {
      // Always increment actions performed
      this.state.actionsPerformed += 1;

      // Check if actor should die (probability increases with each action)
      const deathProbability = this.calculateDeathProbability();
      if (Math.random() < deathProbability) {
        this.die();
        return;
      }

      // Random chance of taking an action or not
      if (Math.random() < 0.7) {
        // 70% chance of taking an action
        // If we have existing loans, monitor them
        if (this.state.loans.size > 0) {
          await this.monitorAndManageLoans();
        } else {
          // Otherwise, consider creating a new loan (only if loan creation hasn't failed before)
          if (Math.random() < 0.8 && !this.failedActions.has('CREATE_LOAN')) {
            // 80% chance of creating a loan
            await this.createLoanApplication();
          } else {
            this.emitAction(ClientActionType.NO_ACTION);
          }
        }
      } else {
        this.emitAction(ClientActionType.NO_ACTION);
      }
    } catch (error) {
      logger.error(
        { error, borrowerId: this.state.borrowerId },
        'Error in client actor',
      );
    }
  }

  /**
   * Calculate probability of actor dying based on actions performed
   */
  private calculateDeathProbability(): number {
    // After 10 actions, always die
    if (this.state.actionsPerformed >= 10) {
      return 1;
    }

    // Otherwise, probability increases with each action
    return this.state.actionsPerformed * 0.1;
  }

  /**
   * Handle actor's death
   */
  private die(): void {
    this.stop();
    this.emitAction(ClientActionType.DEATH);
    this.events.emit('die', this.state.borrowerId);
  }

  /**
   * Create a new loan application
   */
  private async createLoanApplication(): Promise<void> {
    let loanId: string;
    let loanAmount: number;
    let initialCollateral: number;

    try {
      // Get current asset price
      const currentPrice = await this.priceService.getCurrentPrice();

      // Calculate loan amount (up to max allowed for this client)
      loanAmount = Math.min(
        Math.random() * this.state.maxLoanAmount,
        this.state.maxLoanAmount,
      );

      // Calculate initial collateral based on target LTV
      initialCollateral = loanAmount / this.targetLtv;

      // Create loan request
      loanId = uuidv4();
      const loanRequest = {
        requestId: uuidv4(),
        loanId,
        borrowerId: this.state.borrowerId,
        amount: loanAmount.toString(),
      };

      // Send loan application request
      const response = await axios.post(this.loanApiEndpoint, loanRequest);

      // Store loan information locally if successful
      if (response.status === 202) {
        const newLoan: Loan = {
          loanId,
          borrowerId: this.state.borrowerId,
          amount: loanAmount,
          collateral: initialCollateral,
          loanTimestamp: new Date(),
          ltv: loanAmount / initialCollateral,
        };

        this.state.loans.set(loanId, newLoan);

        this.emitAction(
          ClientActionType.CREATE_LOAN,
          { loanId, amount: loanAmount, collateral: initialCollateral },
          true,
        );

        logger.info(
          {
            borrowerId: this.state.borrowerId,
            loanId,
            amount: loanAmount,
            collateral: initialCollateral,
          },
          'Client created loan',
        );
      } else {
        // Non-202 status code means failure - add to failed actions to prevent retries
        this.failedActions.add('CREATE_LOAN');

        this.emitAction(
          ClientActionType.CREATE_LOAN,
          {
            loanId,
            amount: loanAmount,
            collateral: initialCollateral,
            statusCode: response.status,
          },
          false,
        );

        logger.warn(
          {
            borrowerId: this.state.borrowerId,
            loanId,
            statusCode: response.status,
          },
          'Loan application failed - will not retry',
        );
      }
    } catch (error) {
      // Network error or other exception means failure - add to failed actions to prevent retries
      this.failedActions.add('CREATE_LOAN');

      this.emitAction(
        ClientActionType.CREATE_LOAN,
        {
          loanId: loanId!,
          amount: loanAmount!,
          collateral: initialCollateral!,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        false,
      );

      if (error instanceof Error) {
        logger.error(
          { error: error.message, borrowerId: this.state.borrowerId },
          'Error creating loan application - will not retry',
        );
      }
    }
  }

  /**
   * Monitor and manage existing loans
   */
  private async monitorAndManageLoans(): Promise<void> {
    try {
      // Get current asset price
      const currentPrice = await this.priceService.getCurrentPrice();

      // Loop through all loans
      for (const [loanId, loan] of this.state.loans.entries()) {
        // Calculate current LTV
        const currentLtv = loan.amount / loan.collateral;

        // Check if we need to top up collateral
        const ltvThreshold = 0.6 + 0.19 * (1 - this.state.riskTolerance);

        // Only attempt collateral top-up if this loan hasn't had a failed top-up before
        if (currentLtv > ltvThreshold && !this.failedActions.has(`TOP_UP_${loanId}`)) {
          await this.topUpCollateral(loanId, loan, currentLtv, ltvThreshold);
        }
      }
    } catch (error) {
      logger.error(
        { error, borrowerId: this.state.borrowerId },
        'Error monitoring loans',
      );
    }
  }

  /**
   * Top up collateral for a loan
   */
  private async topUpCollateral(
    loanId: string,
    loan: Loan,
    currentLtv: number,
    targetLtvThreshold: number,
  ): Promise<void> {
    let collateralToAdd: number;

    try {
      // Calculate how much collateral to add to reach target LTV
      const targetLtv = this.targetLtv; // Aim for 50% LTV
      const additionalCollateralNeeded =
        loan.amount / targetLtv - loan.collateral;

      // Ensure we add at least some minimum collateral
      collateralToAdd = Math.max(
        additionalCollateralNeeded,
        loan.collateral * 0.1,
      );

      // Create collateral top-up request
      const topUpRequest = {
        requestId: uuidv4(),
        loanId,
        borrowerId: this.state.borrowerId,
        amount: collateralToAdd.toString(),
      };

      // Send collateral top-up request
      const response = await axios.post(
        this.collateralApiEndpoint,
        topUpRequest,
      );

      // Update loan information locally if successful
      if (response.status === 202) {
        const updatedLoan = {
          ...loan,
          collateral: loan.collateral + collateralToAdd,
          ltv: loan.amount / (loan.collateral + collateralToAdd),
        };

        this.state.loans.set(loanId, updatedLoan);

        this.emitAction(
          ClientActionType.TOP_UP_COLLATERAL,
          { loanId, additionalCollateral: collateralToAdd },
          true,
        );

        logger.info(
          {
            borrowerId: this.state.borrowerId,
            loanId,
            additionalCollateral: collateralToAdd,
          },
          'Client topped up loan collateral',
        );
      } else {
        // Non-202 status code means failure - add to failed actions to prevent retries
        this.failedActions.add(`TOP_UP_${loanId}`);

        this.emitAction(
          ClientActionType.TOP_UP_COLLATERAL,
          {
            loanId,
            additionalCollateral: collateralToAdd,
            statusCode: response.status,
          },
          false,
        );

        logger.warn(
          {
            borrowerId: this.state.borrowerId,
            loanId,
            statusCode: response.status,
          },
          'Collateral top-up failed - will not retry for this loan',
        );
      }
    } catch (error) {
      // Network error or other exception means failure - add to failed actions to prevent retries
      this.failedActions.add(`TOP_UP_${loanId}`);

      this.emitAction(
        ClientActionType.TOP_UP_COLLATERAL,
        {
          loanId,
          additionalCollateral: collateralToAdd!,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        false,
      );

      logger.error(
        { error, borrowerId: this.state.borrowerId, loanId },
        'Error topping up collateral - will not retry for this loan',
      );
    }
  }

  /**
   * Get client state
   */
  public getState(): ClientState {
    return { ...this.state, loans: new Map(this.state.loans) };
  }

  /**
   * Get client ID
   */
  public getClientId(): string {
    return this.state.borrowerId;
  }

  /**
   * Get client size
   */
  public getClientSize(): ClientSize {
    return this.state.size;
  }

  /**
   * Get risk tolerance
   */
  public getRiskTolerance(): number {
    return this.state.riskTolerance;
  }

  /**
   * Get actions performed count
   */
  public getActionsPerformed(): number {
    return this.state.actionsPerformed;
  }

  /**
   * Get active loans count
   */
  public getActiveLoansCount(): number {
    return this.state.loans.size;
  }

  /**
   * Get max loan amount
   */
  public getMaxLoanAmount(): number {
    return this.state.maxLoanAmount;
  }

  /**
   * Check if actor is active (not dead)
   */
  public isActive(): boolean {
    return this.state.actionsPerformed < 10;
  }

  /**
   * Get failed actions for this actor
   */
  public getFailedActions(): string[] {
    return Array.from(this.failedActions);
  }

  /**
   * Emit an action event
   */
  private emitAction(
    action: ClientActionType,
    data?: Record<string, unknown>,
    success: boolean = true,
  ): void {
    this.events.emit('action', this.state.borrowerId, action, {
      ...data,
      success,
    });
  }
}
