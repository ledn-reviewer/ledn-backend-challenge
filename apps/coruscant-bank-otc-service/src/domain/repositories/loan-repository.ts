import { Loan } from '../entities/loan';
import { LoanId } from '../value-objects/loan-id';
import { BorrowerId } from '../value-objects/borrower-id';

export interface LoanRepository {
  save(loan: Loan): Promise<void>;
  findById(id: LoanId): Promise<Loan | null>;
  findByBorrowerId(borrowerId: BorrowerId): Promise<Loan[]>;
  findAll(): Promise<Loan[]>;
  delete(id: LoanId): Promise<void>;
}