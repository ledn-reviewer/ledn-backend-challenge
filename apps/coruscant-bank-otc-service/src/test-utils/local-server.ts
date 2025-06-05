import express from 'express';
import { Server } from 'http';
import { createApiRouter } from '../routes/api';

let server: Server | undefined;

/**
 * Starts a local server instance for testing
 * @returns {Promise<void>} Promise that resolves when the server is ready
 */
export const startLocalServer = async (): Promise<void> => {
  if (server) {
    return;
  }

  return new Promise((resolve) => {
    const app = express();
    const processedRequests = new Set<string>();

    // Initialize routes
    app.use(express.json());
    app.use('/api', createApiRouter(processedRequests));

    // Start server on a test port
    server = app.listen(3000, () => {
      resolve();
    });
  });
};

/**
 * Stops the local server instance
 * @returns {Promise<void>} Promise that resolves when the server is closed
 */
export const stopLocalServer = async (): Promise<void> => {
  if (!server) {
    return;
  }

  return new Promise((resolve, reject) => {
    server!.close((err) => {
      if (err) {
        reject(err);
      } else {
        server = undefined;
        resolve();
      }
    });
  });
};
