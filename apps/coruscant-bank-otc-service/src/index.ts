import express from 'express';
import dotenv from 'dotenv';
import * as http from 'http';
import path from 'path';
import { receiveAndProcessMessages } from './services/sqs/consumer';
import { subscribeSqsToSnsTopic } from './services/sns/subscriber';
import { LoanEventHandler, LoanEventStore } from './handlers/loanEventHandler';
import { setupSwaggerUI } from './config/openapi';
import { createApiRouter } from './routes/api';
import { createSimulationRouter } from './routes/simulation-api';
import { createEventHistoryRouter } from './routes/event-history-api';
import { createDashboardRouter } from './routes/dashboard-api';
import { initializeSimulator, autoStartSimulatorIfEnabled } from './simulation';
import { EventHistoryStore } from './utils/event-store';
import { requestLogger } from './middleware/logging';
import { isSelfPublishingEnabled } from './services/sns/publisher';
import { DashboardWebSocketService } from './services/websocket/dashboard-websocket';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize application
const app = express();
const server: http.Server = http.createServer(app);
let isShuttingDown = false;
let dashboardWebSocket: DashboardWebSocketService;

app.use(express.json());

// Configure static file serving
app.use(express.static(path.join(__dirname, '../public')));

// Add request logging middleware
app.use(requestLogger);

// In-memory stores for idempotency
const processedRequests = new Set<string>();

// Environment variables
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const maxInMemoryEvents = parseInt(process.env.MAX_IN_MEMORY_EVENTS || '1000');
const selfPublishingEnabled = isSelfPublishingEnabled();

// Initialize event handler and event stores
const loanEventHandler = new LoanEventHandler();
const eventStore = LoanEventStore.getInstance();
const eventHistoryStore = EventHistoryStore.getInstance({
  maxInMemoryEvents
});

logger.info({
  maxInMemoryEvents,
  selfPublishingEnabled
}, 'Service configuration initialized');

// Function to start polling SQS queue
const startSqsPolling = async (pollingIntervalMs = 30000): Promise<void> => {
  try {
    await receiveAndProcessMessages(loanEventHandler);
    logger.debug('SQS polling completed, scheduling next poll');

    // Schedule next poll and make sure it doesn't keep the process alive
    const timer = setTimeout(startSqsPolling, pollingIntervalMs);
    timer.unref();
  } catch (error) {
    logger.error({ error }, 'Error polling SQS queue');

    // Retry with backoff and make sure it doesn't keep the process alive
    const timer = setTimeout(startSqsPolling, pollingIntervalMs * 2);
    timer.unref();
  }
};

// Subscribe to SNS topic and start polling SQS queue
(async () => {
  try {
    // Subscribe SQS queue to SNS topic
    await subscribeSqsToSnsTopic();
    logger.info('Successfully subscribed to SNS topic');

    // Start polling SQS queue
    startSqsPolling();
  } catch (error) {
    logger.error({ error }, 'Failed to set up AWS services');
  }
})();

// Setup Swagger UI
setupSwaggerUI(app);

// Setup API routes
app.use('/', createApiRouter(processedRequests));

// Setup event history routes
app.use('/event-history', createEventHistoryRouter());

// Initialize the client simulator
const apiBaseUrl = `http://localhost:${port}`;
const clientSimulator = initializeSimulator(apiBaseUrl);

// Setup simulation control routes
app.use('/simulation', createSimulationRouter(clientSimulator));

// Setup dashboard routes
app.use('/dashboard', createDashboardRouter(clientSimulator));

// Graceful shutdown implementation
const gracefulShutdown = async (signal: string): Promise<void> => {
  // If we're already shutting down, or this is a second SIGINT (force exit)
  if (isShuttingDown) {
    logger.warn('Received second shutdown signal, forcing exit');
    process.exit(0);
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, 'Shutdown signal received, closing connections');

  // For SIGINT (Ctrl+C), set a shorter timeout to ensure responsiveness
  const forceExitTimeout = setTimeout(() => {
    logger.warn('Graceful shutdown timeout exceeded, forcing exit');
    process.exit(0);
  }, signal === 'SIGINT' ? 2000 : 5000);

  // Make sure the force exit timeout doesn't keep the process alive
  forceExitTimeout.unref();

  try {
    // Stop the client simulator first (likely the most resource-intensive activity)
    logger.info('Stopping client simulator');
    clientSimulator.stop();

    // Stop WebSocket service
    if (dashboardWebSocket) {
      logger.info('Stopping dashboard WebSocket service');
      dashboardWebSocket.stop();
    }

    // Stop accepting new connections
    logger.info('Closing HTTP server');
    server.close(() => {
      logger.info('HTTP server closed successfully');
    });

    logger.info('Shutdown complete, exiting process');

    // Clear the force exit timeout as we're exiting cleanly
    clearTimeout(forceExitTimeout);

    // Exit immediately for Ctrl+C for better user experience
    if (signal === 'SIGINT') {
      process.exit(0);
    } else {
      // For other signals (like SIGTERM), allow a short time for logs to flush
      setTimeout(() => {
        process.exit(0);
      }, 300);
    }
  } catch (error) {
    logger.error({ error }, 'Error during graceful shutdown');
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => {
  logger.info('SIGTERM received (server shutdown)');
  gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  logger.info('SIGINT received (Ctrl+C)');
  gracefulShutdown('SIGINT');
});

// Handle uncaught exceptions and unhandled promise rejections to ensure they don't prevent exit
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception detected');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason }, 'Unhandled promise rejection detected');
  process.exit(1);
});

// Start the server
server.listen(port, () => {
  // Initialize WebSocket service after server starts
  dashboardWebSocket = new DashboardWebSocketService(server, clientSimulator);

  logger.info(
    {
      port,
      swaggerUrl: `http://localhost:${port}/api-docs`,
      simulationUrl: `http://localhost:${port}/simulation/stats`,
      eventHistoryUrl: `http://localhost:${port}/event-history`,
      dashboardUrl: `http://localhost:${port}/dashboard`,
      selfPublishingEnabled
    },
    selfPublishingEnabled ?
      'Coruscant Bank OTC Service started (with self-publishing enabled)' :
      'Coruscant Bank OTC Service started (forwarding to liquidation service)'
  );

  // Auto-start simulator if configured
  autoStartSimulatorIfEnabled(clientSimulator);
});

// Export event history store for access via API if needed
export { eventHistoryStore };
