import { ClientSimulator } from './client-simulator';
import logger from '../utils/logger';

// Default configuration
const DEFAULT_MAX_CLIENTS = 10;
const DEFAULT_ACTION_INTERVAL_MS = 1000;

/**
 * Initialize and configure the client simulator
 */
export const initializeSimulator = (baseUrl: string): ClientSimulator => {
  // Read configuration from environment variables
  const maxClients = parseInt(process.env.SIMULATOR_MAX_CLIENTS || `${DEFAULT_MAX_CLIENTS}`, 10);
  const actionIntervalMs = parseInt(process.env.SIMULATOR_ACTION_INTERVAL_MS || `${DEFAULT_ACTION_INTERVAL_MS}`, 10);
  const priceServiceApiEndpoint = process.env.PRICE_SERVICE_API_ENDPOINT;

  // Create simulator instance
  const simulator = new ClientSimulator({
    maxClients,
    actionIntervalMs,
    apiBaseUrl: baseUrl,
    priceServiceApiEndpoint
  });

  return simulator;
};

/**
 * Start the simulator if auto-start is enabled
 */
export const autoStartSimulatorIfEnabled = (simulator: ClientSimulator): void => {
  const autoStart = process.env.SIMULATOR_AUTO_START === 'true';

  if (autoStart) {
    logger.info('Auto-starting client simulator...');
    simulator.start();
  } else {
    logger.info('Client simulator is ready (auto-start disabled)');
  }
};
