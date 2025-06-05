import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { ClientSimulator } from '../../simulation/client-simulator';
import logger from '../../utils/logger';

interface ActivityEventData {
  actorId: string;
  action: string;
  actionType: string;
  prettyActionName: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

/**
 * WebSocket service for real-time dashboard updates
 */
export class DashboardWebSocketService {
  private wss: WebSocketServer;
  private simulator: ClientSimulator;
  private clients: Set<WebSocket>;
  private updateInterval: NodeJS.Timeout | null;

  constructor(server: Server, simulator: ClientSimulator) {
    this.wss = new WebSocketServer({
      server,
      path: '/dashboard/ws'
    });
    this.simulator = simulator;
    this.clients = new Set();
    this.updateInterval = null;

    this.setupWebSocketServer();
    this.startBroadcasting();
    this.setupSimulatorEventListeners();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('Dashboard WebSocket client connected');
      this.clients.add(ws);

      // Send initial data immediately
      this.sendDashboardData(ws).catch(error => {
        logger.error({ error }, 'Error sending initial dashboard data');
      });

      ws.on('close', () => {
        logger.info('Dashboard WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error({ error }, 'Dashboard WebSocket client error');
        this.clients.delete(ws);
      });

      // Handle incoming messages from clients
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(ws, data);
        } catch (error) {
          logger.error({ error }, 'Error parsing WebSocket message');
        }
      });
    });

    this.wss.on('error', (error) => {
      logger.error({ error }, 'Dashboard WebSocket server error');
    });
  }

  private handleClientMessage(ws: WebSocket, data: any): void {
    // Handle different types of messages from the client
    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      case 'request_update':
        this.sendDashboardData(ws).catch(error => {
          logger.error({ error }, 'Error sending requested dashboard data');
        });
        break;
      default:
        logger.warn({ messageType: data.type }, 'Unknown WebSocket message type');
    }
  }

  private startBroadcasting(): void {
    // Broadcast updates every 2 seconds
    this.updateInterval = setInterval(() => {
      if (this.clients.size > 0) {
        this.broadcastDashboardData().catch(error => {
          logger.error({ error }, 'Error broadcasting dashboard data');
        });
      }
    }, 2000);

    // Make sure the interval doesn't keep the process alive
    if (this.updateInterval && this.updateInterval.unref) {
      this.updateInterval.unref();
    }
  }

  private async broadcastDashboardData(): Promise<void> {
    if (this.clients.size === 0) return;

    const data = await this.getDashboardData();
    const message = JSON.stringify(data);

    // Send to all connected clients
    const deadClients: WebSocket[] = [];

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          logger.error({ error }, 'Error sending WebSocket message');
          deadClients.push(client);
        }
      } else {
        deadClients.push(client);
      }
    });

    // Clean up dead connections
    deadClients.forEach(client => {
      this.clients.delete(client);
    });
  }

  private async sendDashboardData(ws: WebSocket): Promise<void> {
    if (ws.readyState !== WebSocket.OPEN) return;

    const data = await this.getDashboardData();

    try {
      ws.send(JSON.stringify(data));
    } catch (error) {
      logger.error({ error }, 'Error sending individual WebSocket message');
      this.clients.delete(ws);
    }
  }

  private async getDashboardData(): Promise<any> {
    const stats = this.simulator.getStatistics();
    const detailedStats = this.simulator.getDetailedStatistics();

    // Get current price from the simulator's price service
    let currentPrice = null;
    try {
      const priceService = (this.simulator as any).priceService;
      if (priceService) {
        const priceData = await priceService.getCurrentPrice();
        currentPrice = {
          price: priceData.price,
          timestamp: priceData.timestamp
        };
      }
    } catch (error) {
      logger.error({ error }, 'Error fetching current price');
    }

    // Get all loans from all actors
    const loans = this.getAllLoansFromActors();

    // Add enhanced performance metrics
    const performance = {
      ...(detailedStats.performance || {}),
      successRate: this.calculateSuccessRate(),
      responseTime: this.getAverageResponseTime(),
      actorTurnover: this.getActorTurnoverRate()
    };

    return {
      type: 'dashboard_update',
      ...stats,
      ...detailedStats,
      performance,
      currentPrice,
      loans,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get all loans from all active actors
   */
  private getAllLoansFromActors(): Array<{ loanId: string; amount: number; collateral: number; borrowerId: string; loanTimestamp: Date; ltv: number }> {
    const loans: Array<{ loanId: string; amount: number; collateral: number; borrowerId: string; loanTimestamp: Date; ltv: number }> = [];
    
    try {
      // Access the simulator's internal clients map
      const clients = (this.simulator as any).clients;
      
      if (clients && clients instanceof Map) {
        clients.forEach((client: any) => {
          try {
            const clientState = client.getState();
            if (clientState && clientState.loans && clientState.loans instanceof Map) {
              clientState.loans.forEach((loan: any) => {
                loans.push({
                  loanId: loan.loanId,
                  amount: loan.amount,
                  collateral: loan.collateral,
                  borrowerId: loan.borrowerId,
                  loanTimestamp: loan.loanTimestamp,
                  ltv: loan.ltv
                });
              });
            }
          } catch (error) {
            logger.warn({ error }, 'Error accessing client loan data');
          }
        });
      }
    } catch (error) {
      logger.error({ error }, 'Error fetching loans from actors');
    }
    
    return loans;
  }

  /**
   * Calculate the success rate of actor actions (placeholder implementation)
   */
  private calculateSuccessRate(): number {
    // In a real implementation, this would track successful vs failed actions
    // For now, return a randomized value around 85-95%
    return 85 + Math.random() * 10;
  }

  /**
   * Get average response time for API calls (placeholder implementation)
   */
  private getAverageResponseTime(): number {
    // In a real implementation, this would track actual API response times
    // For now, return a randomized value between 50-150ms
    return 50 + Math.random() * 100;
  }

  /**
   * Get actor turnover rate (births/deaths per minute)
   */
  private getActorTurnoverRate(): number {
    // In a real implementation, this would track how quickly actors are replaced
    // For now, return a randomized value between 0.5-2
    return 0.5 + Math.random() * 1.5;
  }

  /**
   * Send a specific event to all connected clients
   */
  public broadcastEvent(eventType: string, data: any): void {
    if (this.clients.size === 0) return;

    const message = JSON.stringify({
      type: 'event',
      eventType,
      data,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          logger.error({ error }, 'Error broadcasting event');
        }
      }
    });
  }

  /**
   * Get the number of connected clients
   */
  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Get pretty name for action type
   */
  private getPrettyActionName(action: string): string {
    const actionNames: Record<string, string> = {
      'CREATE_LOAN': 'Loan Application',
      'TOP_UP_COLLATERAL': 'Collateral Top-up',
      'BIRTH': 'Actor Birth',
      'DEATH': 'Actor Death'
    };
    return actionNames[action] || action;
  }

  /**
   * Get action type category
   */
  private getActionType(action: string): string {
    const actionTypes: Record<string, string> = {
      'CREATE_LOAN': 'loan',
      'TOP_UP_COLLATERAL': 'collateral',
      'BIRTH': 'lifecycle',
      'DEATH': 'lifecycle'
    };
    return actionTypes[action] || 'unknown';
  }

  /**
   * Setup event listeners for simulator events
   */
  private setupSimulatorEventListeners(): void {
    // Get the simulator's internal event emitter to listen for actor actions
    const simulatorEvents = (this.simulator as any).events;
    
    if (simulatorEvents) {
      simulatorEvents.on('action', (clientId: string, action: string, data?: any) => {
        // Only broadcast actions that are actual business operations, not idle time
        if (action !== 'NO_ACTION') {
          this.broadcastActivityEvent({
            actorId: clientId,
            action,
            actionType: this.getActionType(action),
            prettyActionName: this.getPrettyActionName(action),
            data,
            timestamp: new Date().toISOString()
          });
        }
      });
    }
  }


  /**
   * Broadcast activity event to all connected clients
   */
  private broadcastActivityEvent(eventData: ActivityEventData): void {
    if (this.clients.size === 0) return;

    const message = JSON.stringify({
      type: 'activity_event',
      ...eventData
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          logger.error({ error }, 'Error broadcasting activity event');
        }
      }
    });
  }

  /**
   * Stop the WebSocket service
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Close all client connections
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Service shutting down');
      }
    });

    this.clients.clear();

    // Close the WebSocket server
    this.wss.close(() => {
      logger.info('Dashboard WebSocket server closed');
    });
  }
}
