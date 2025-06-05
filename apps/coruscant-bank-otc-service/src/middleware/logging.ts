import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Express middleware for request logging
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Log the request
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || req.body?.requestId;

  // Create logger child with request context
  const requestLogger = logger.child({
    reqId: requestId,
    method: req.method,
    url: req.url,
  });

  requestLogger.info('Request received');

  // Store logger in request for use in route handlers
  res.locals.logger = requestLogger;

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    requestLogger.info({
      status: res.statusCode,
      duration,
    }, 'Request completed');
  });

  next();
};
