import { Router } from 'express';
import { LoanController } from '../controllers/loan-controller';
import { validateLoanApplicationRequest, validateCollateralTopUpRequest, idempotencyCheck } from '../../middleware/validators';

export function createLoanRoutes(
  loanController: LoanController,
  processedRequests: Set<string>
): Router {
  const router = Router();

  // Common idempotency check middleware
  const checkIdempotency = idempotencyCheck(processedRequests);

  // Loan application endpoint
  router.post('/loan-applications',
    validateLoanApplicationRequest,
    checkIdempotency,
    (req, res) => loanController.submitLoanApplication(req, res)
  );

  // Collateral top-up endpoint
  router.post('/collateral-top-ups',
    validateCollateralTopUpRequest,
    checkIdempotency,
    (req, res) => loanController.submitCollateralTopUp(req, res)
  );

  return router;
}