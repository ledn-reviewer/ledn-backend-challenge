import express from 'express';
import dotenv from 'dotenv';
import * as http from 'http';
import path from 'path';
import { DependencyContainer } from './infrastructure/config/dependency-container';
import { LoanController } from './presentation/controllers/loan-controller';
import { createLoanRoutes } from './presentation/routes/loan-routes';
import { setupSwaggerUI } from './config/openapi';
import { requestLogger } from './middleware/logging';
import logger from './utils/logger';

// Load environment variables first
dotenv.config();

export class Application {
  private readonly app: express.Application;
  private readonly server: http.Server;
  private readonly container: DependencyContainer;
  private readonly processedRequests: Set<string> = new Set();

  constructor() {
    this.container = DependencyContainer.getInstance();
    this.app = express();
    this.server = http.createServer(this.app);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  public async start(): Promise<void> {
    const config = this.container.getConfigurationService();
    const port = config.getPort();

    return new Promise((resolve) => {
      this.server.listen(port, () => {
        logger.info({
          port,
          swaggerUrl: `http://localhost:${port}/api-docs`,
          selfPublishingEnabled: config.isSelfPublishingEnabled()
        }, 'Coruscant Bank OTC Service started');
        
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        logger.info('Application stopped');
        resolve();
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }

  private setupMiddleware(): void {
    // Basic middleware
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));
    this.app.use(requestLogger);

    // Setup Swagger UI
    setupSwaggerUI(this.app as any);
  }

  private setupRoutes(): void {
    // Create controllers with dependencies
    const loanController = new LoanController(
      this.container.getSubmitLoanApplicationUseCase(),
      this.container.getSubmitCollateralTopUpUseCase()
    );

    // Setup routes
    this.app.use('/api', createLoanRoutes(loanController, this.processedRequests));

    // Health check endpoints
    this.setupHealthRoutes();
  }

  private setupHealthRoutes(): void {
    const config = this.container.getConfigurationService();

    this.app.get('/api/health', (_, res) => {
      res.json({
        status: 'ok',
        selfPublishingEnabled: config.isSelfPublishingEnabled(),
        timestamp: new Date().toISOString()
      });
    });

    this.app.get('/api/healthz', (_, res) => {
      res.status(200).send('ok');
    });
  }

  private setupErrorHandling(): void {
    // Handle uncaught exceptions and unhandled promise rejections
    process.on('uncaughtException', (error) => {
      logger.fatal({ error }, 'Uncaught exception detected');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.fatal({ reason }, 'Unhandled promise rejection detected');
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info({ signal }, 'Shutdown signal received');
      
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during graceful shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  const app = new Application();
  app.start().catch((error) => {
    logger.fatal({ error }, 'Failed to start application');
    process.exit(1);
  });
}