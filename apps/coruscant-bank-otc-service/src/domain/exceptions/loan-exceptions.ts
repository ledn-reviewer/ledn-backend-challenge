import { DomainException } from './domain-exception';
import { LoanId } from '../value-objects/loan-id';
import { BorrowerId } from '../value-objects/borrower-id';

export class LoanNotFoundException extends DomainException {
  constructor(loanId: LoanId) {
    super(
      `Loan not found: ${loanId.getValue()}`,
      'LOAN_NOT_FOUND',
      { loanId: loanId.getValue() }
    );
  }
}

export class InsufficientCollateralException extends DomainException {
  constructor(requiredAmount: number, providedAmount: number) {
    super(
      `Insufficient collateral: required ${requiredAmount}, provided ${providedAmount}`,
      'INSUFFICIENT_COLLATERAL',
      { requiredAmount, providedAmount }
    );
  }
}

export class InvalidLoanStateException extends DomainException {
  constructor(currentState: string, requiredState: string, operation: string) {
    super(
      `Cannot ${operation} loan in state ${currentState}. Required state: ${requiredState}`,
      'INVALID_LOAN_STATE',
      { currentState, requiredState, operation }
    );
  }
}

export class BorrowerMismatchException extends DomainException {
  constructor(loanId: LoanId, expectedBorrowerId: BorrowerId, actualBorrowerId: BorrowerId) {
    super(
      `Borrower mismatch for loan ${loanId.getValue()}: expected ${expectedBorrowerId.getValue()}, got ${actualBorrowerId.getValue()}`,
      'BORROWER_MISMATCH',
      { 
        loanId: loanId.getValue(),
        expectedBorrowerId: expectedBorrowerId.getValue(),
        actualBorrowerId: actualBorrowerId.getValue()
      }
    );
  }
}