import pino from 'pino';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Generate a unique instance ID for this service instance
const instanceId = uuidv4().split('-')[0];

// Determine if we're in a test environment
const isTest = process.env.NODE_ENV === 'test';

// Logger options
const loggerOptions = {
  transport: !isTest && process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname,instanceId', // Don't display these in pretty output
    }
  } : undefined,
  level: isTest ? 'silent' : (process.env.LOG_LEVEL || 'info'),
  enabled: !isTest, // Disable logging in test environment
  base: {
    service: 'coruscant-bank-otc-service',
    instanceId,
    hostname: os.hostname(),
    pid: process.pid,
    env: process.env.NODE_ENV || 'development'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

// Configure logger
const logger = pino(loggerOptions);

// Log startup information (only if not in test environment)
if (!isTest) {
  logger.info({
    nodeVersion: process.version,
    platform: process.platform,
    startupTime: new Date().toISOString()
  }, 'Logger initialized');
}

/**
 * Utilities for testing - allows tests to enable/disable logging
 */
export const testUtils = {
  /**
   * Enable logging during tests
   */
  enableLogging: (): void => {
    if (isTest) {
      logger.level = process.env.LOG_LEVEL || 'info';
    }
  },

  /**
   * Disable logging during tests
   */
  disableLogging: (): void => {
    if (isTest) {
      logger.level = 'silent';
    }
  }
};

export default logger;
