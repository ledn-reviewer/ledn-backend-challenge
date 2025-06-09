import { Request, Response } from 'express';
import { SubmitLoanApplicationUseCase } from '../../application/use-cases/submit-loan-application';
import { SubmitCollateralTopUpUseCase } from '../../application/use-cases/submit-collateral-top-up';
import { DomainException } from '../../domain/exceptions/domain-exception';
import { ApplicationException } from '../../application/exceptions/application-exceptions';
import logger from '../../utils/logger';

export class LoanController {
  constructor(
    private readonly submitLoanApplicationUseCase: SubmitLoanApplicationUseCase,
    private readonly submitCollateralTopUpUseCase: SubmitCollateralTopUpUseCase
  ) {}

  public async submitLoanApplication(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.submitLoanApplicationUseCase.execute(req.body);
      
      res.status(202).json({
        message: 'Loan application submitted',
        requestId: result.requestId,
        timestamp: result.timestamp,
        publishedToSNS: result.published
      });
    } catch (error) {
      this.handleError(error, res, req.body.requestId);
    }
  }

  public async submitCollateralTopUp(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.submitCollateralTopUpUseCase.execute(req.body);
      
      res.status(202).json({
        message: 'Collateral top-up submitted',
        requestId: result.requestId,
        timestamp: result.timestamp,
        publishedToSNS: result.published
      });
    } catch (error) {
      this.handleError(error, res, req.body.requestId);
    }
  }

  private handleError(error: unknown, res: Response, requestId?: string): void {
    if (error instanceof DomainException || error instanceof ApplicationException) {
      logger.warn({ 
        error: {
          message: error.message,
          code: error.code,
          context: error.context
        },
        requestId 
      }, 'Business logic error');

      const statusCode = this.getStatusCodeForException(error);
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
        requestId
      });
    } else {
      logger.error({ error, requestId }, 'Unexpected error processing request');
      res.status(500).json({
        error: 'Processing failure',
        requestId
      });
    }
  }

  private getStatusCodeForException(error: DomainException | ApplicationException): number {
    switch (error.code) {
      case 'LOAN_NOT_FOUND':
        return 404;
      case 'DUPLICATE_REQUEST':
        return 409;
      case 'VALIDATION_ERROR':
      case 'INSUFFICIENT_COLLATERAL':
      case 'BORROWER_MISMATCH':
      case 'INVALID_LOAN_STATE':
        return 400;
      case 'EXTERNAL_SERVICE_ERROR':
        return 502;
      default:
        return 500;
    }
  }
}