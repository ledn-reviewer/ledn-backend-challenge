import { EventEmitter } from 'events';
import { ClientActor } from './actors/client-actor';
import { SimplePriceService } from './services/price-service';
import { ClientEvents, ClientActionType } from './models/types';
import logger from '../utils/logger';

/**
 * Configuration for Client Simulator
 */
export interface ClientSimulatorConfig {
  maxClients: number;
  actionIntervalMs: number;
  apiBaseUrl: string;
  priceServiceApiEndpoint?: string;
}

/**
 * Client Simulator class that manages multiple client actors
 */
export class ClientSimulator {
  private config: ClientSimulatorConfig;
  private clients: Map<string, ClientActor>;
  private events: ClientEvents;
  private priceService: SimplePriceService;
  private isRunning: boolean;
  private statistics: {
    loanApplications: number;
    collateralTopUps: number;
    births: number;
    deaths: number;
  };

  /**
   * Create a new client simulator
   * @param config Configuration for the simulator
   */
  constructor(config: ClientSimulatorConfig) {
    this.config = config;
    this.clients = new Map();
    this.events = new EventEmitter() as ClientEvents;
    this.priceService = new SimplePriceService(10000, 0.08, config.priceServiceApiEndpoint);
    this.isRunning = false;
    this.statistics = {
      loanApplications: 0,
      collateralTopUps: 0,
      births: 0,
      deaths: 0
    };

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for client actions
   */
  private setupEventListeners(): void {
    // Listen for client actions
    this.events.on('action', (clientId, action) => {
      // Only count actions that are actual business operations, not idle time
      if (action !== ClientActionType.NO_ACTION) {
        switch (action) {
          case ClientActionType.CREATE_LOAN:
            this.statistics.loanApplications++;
            break;
          case ClientActionType.TOP_UP_COLLATERAL:
            this.statistics.collateralTopUps++;
            break;
          case ClientActionType.BIRTH:
            this.statistics.births++;
            break;
          case ClientActionType.DEATH:
            this.statistics.deaths++;
            break;
          default:
            break;
        }
      }
    });

    // Listen for client deaths
    this.events.on('die', (clientId) => {
      // Remove the dead client
      this.clients.delete(clientId);

      // Create a new client to replace the dead one
      this.spawnClient();

      logger.info({ clientId, deaths: this.statistics.deaths }, 'Client died and was replaced with a new one');
    });
  }

  /**
   * Start the simulator
   */
  public start(): void {
    if (this.isRunning) {
      logger.info('Client simulator is already running');
      return;
    }

    logger.info({ maxClients: this.config.maxClients }, 'Starting client simulator');

    // Spawn initial clients
    for (let i = 0; i < this.config.maxClients; i++) {
      this.spawnClient();
    }

    this.isRunning = true;
    logger.info('Client simulator started');
  }

  /**
   * Stop the simulator
   */
  public stop(): void {
    if (!this.isRunning) {
      logger.info('Client simulator is not running');
      return;
    }

    // Stop all client actors
    for (const client of this.clients.values()) {
      try {
        client.stop();
      } catch (error) {
        logger.error({ error, clientId: client.getClientId() }, 'Error stopping client');
      }
    }

    // Clear the clients map
    this.clients.clear();

    // Remove all event listeners to prevent memory leaks
    this.events.removeAllListeners();

    this.isRunning = false;
    logger.info({ activeClients: this.clients.size }, 'Client simulator stopped and resources cleaned up');
  }

  /**
   * Spawn a new client actor
   */
  private spawnClient(): ClientActor {
    const client = new ClientActor(
      this.priceService,
      this.events,
      this.config.actionIntervalMs,
      this.config.apiBaseUrl
    );

    // Store and start the client
    this.clients.set(client.getClientId(), client);
    client.start();

    return client;
  }

  /**
   * Get current statistics
   */
  public getStatistics(): Record<string, unknown> {
    return {
      ...this.statistics,
      activeClients: this.clients.size,
      clientSizes: this.getClientSizeDistribution(),
      isRunning: this.isRunning,
      config: {
        maxClients: this.config.maxClients,
        actionIntervalMs: this.config.actionIntervalMs
      }
    };
  }

  /**
   * Get detailed statistics including individual actor information
   */
  public getDetailedStatistics(): Record<string, unknown> {
    const actors = Array.from(this.clients.values()).map(client => ({
      id: client.getClientId(),
      type: client.getClientSize(),
      riskTolerance: client.getRiskTolerance(),
      actionsPerformed: client.getActionsPerformed(),
      activeLoans: client.getActiveLoansCount(),
      maxLoanAmount: client.getMaxLoanAmount(),
      isActive: client.isActive()
    }));

    return {
      actors,
      lastAction: this.getLastAction(),
      performance: this.getPerformanceMetrics()
    };
  }

  /**
   * Get the last action performed by any actor
   */
  private getLastAction(): string | null {
    // This would ideally track the most recent action
    // For now, return a placeholder
    return null;
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(): Record<string, unknown> {
    return {
      averageActionsPerActor: this.clients.size > 0 ?
        Array.from(this.clients.values()).reduce((sum, client) => sum + client.getActionsPerformed(), 0) / this.clients.size : 0,
      totalActiveLoans: Array.from(this.clients.values()).reduce((sum, client) => sum + client.getActiveLoansCount(), 0)
    };
  }

  /**
   * Calculate client size distribution
   */
  private getClientSizeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const client of this.clients.values()) {
      const size = client.getClientSize();
      distribution[size] = (distribution[size] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Check if the simulator is running
   */
  public isSimulatorRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Configure simulator settings
   */
  public configure(config: Partial<ClientSimulatorConfig>): void {
    if (this.isRunning) {
      throw new Error('Cannot configure simulator while it is running');
    }

    if (config.maxClients !== undefined) {
      this.config.maxClients = config.maxClients;
    }

    if (config.actionIntervalMs !== undefined) {
      this.config.actionIntervalMs = config.actionIntervalMs;
    }

    // Update API endpoint if provided
    if (config.apiBaseUrl !== undefined) {
      this.config.apiBaseUrl = config.apiBaseUrl;
    }

    if (config.priceServiceApiEndpoint !== undefined) {
      this.config.priceServiceApiEndpoint = config.priceServiceApiEndpoint;
      this.priceService = new SimplePriceService(10000, 0.08, config.priceServiceApiEndpoint);
    }
  }

  /**
   * Get configured max clients
   */
  public getMaxClients(): number {
    return this.config.maxClients;
  }

  /**
   * Get configured action interval
   */
  public getActionInterval(): number {
    return this.config.actionIntervalMs;
  }
}
