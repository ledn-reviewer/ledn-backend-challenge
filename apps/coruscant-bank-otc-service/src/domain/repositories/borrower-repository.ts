import { Borrower } from '../entities/borrower';
import { BorrowerId } from '../value-objects/borrower-id';

export interface BorrowerRepository {
  save(borrower: Borrower): Promise<void>;
  findById(id: BorrowerId): Promise<Borrower | null>;
  findAll(): Promise<Borrower[]>;
  delete(id: BorrowerId): Promise<void>;
}