import { BorrowerId } from '../value-objects/borrower-id';

export class Borrower {
  constructor(
    private readonly id: BorrowerId,
    private readonly createdAt: Date = new Date()
  ) {}

  public getId(): BorrowerId {
    return this.id;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public equals(other: Borrower): boolean {
    return this.id.equals(other.id);
  }
}