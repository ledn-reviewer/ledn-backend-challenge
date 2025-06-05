import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { loadOpenApiSchema } from '../config/openapi';
import logger from '../utils/logger';

// Create Zod schemas based on OpenAPI definitions
const loanApplicationSchema = z.object({
  requestId: z.string().nonempty(),
  loanId: z.string().nonempty(),
  amount: z.string().nonempty(),
  borrowerId: z.string().nonempty()
});

const collateralTopUpSchema = z.object({
  requestId: z.string().nonempty(),
  loanId: z.string().nonempty(),
  borrowerId: z.string().nonempty(),
  amount: z.string().nonempty()
});

// Types based on Zod schemas
export type LoanApplicationRequest = z.infer<typeof loanApplicationSchema>;
export type CollateralTopUpRequest = z.infer<typeof collateralTopUpSchema>;

// Error response helper
const sendValidationError = (res: Response, errors: z.ZodError) => {
  return res.status(400).json({
    error: 'Validation Error',
    details: errors.errors
  });
};

// Middleware for loan application validation
export const validateLoanApplicationRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    loanApplicationSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error({ errors: error.errors }, 'Invalid loan application request');
      sendValidationError(res, error);
      return;
    }

    // For other types of errors
    logger.error({ error }, 'Unexpected validation error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Middleware for collateral top-up validation
export const validateCollateralTopUpRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    collateralTopUpSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error({ errors: error.errors }, 'Invalid collateral top-up request');
      sendValidationError(res, error);
      return;
    }

    // For other types of errors
    logger.error({ error }, 'Unexpected validation error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Middleware for checking idempotency
export const idempotencyCheck = (processedRequests: Set<string>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { requestId } = req.body;

    if (!requestId) {
      res.status(400).json({ error: 'Missing requestId' });
      return;
    }

    if (processedRequests.has(requestId)) {
      res.status(409).json({ message: 'Request already processed', requestId });
      return;
    }

    // Request is new, add to processed requests and proceed
    processedRequests.add(requestId);
    next();
  };
};
