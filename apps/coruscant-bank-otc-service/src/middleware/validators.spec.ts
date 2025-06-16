import { Request, Response } from 'express';
import { validateLoanApplicationRequest, validateCollateralTopUpRequest } from './validators';

describe('Validation Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('validateLoanApplicationRequest', () => {
    it('should call next for valid payload', () => {
      req.body = {
        requestId: 'req-1',
        loanId: 'loan-1',
        amount: '100',
        borrowerId: 'user-1'
      };

      validateLoanApplicationRequest(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid payload', () => {
      req.body = { invalid: 'data' };

      validateLoanApplicationRequest(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateCollateralTopUpRequest', () => {
    it('should call next for valid payload', () => {
      req.body = {
        requestId: 'req-2',
        loanId: 'loan-2',
        borrowerId: 'user-2',
        amount: '50'
      };

      validateCollateralTopUpRequest(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid payload', () => {
      req.body = { foo: 'bar' };

      validateCollateralTopUpRequest(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
