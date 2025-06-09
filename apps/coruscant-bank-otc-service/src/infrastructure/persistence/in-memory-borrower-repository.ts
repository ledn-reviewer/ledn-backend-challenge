import { Borrower } from '../../domain/entities/borrower';
import { BorrowerId } from '../../domain/value-objects/borrower-id';
import { BorrowerRepository } from '../../domain/repositories/borrower-repository';

interface BorrowerData {
  id: string;
  createdAt: string;
}

export class InMemoryBorrowerRepository implements BorrowerRepository {
  private borrowers: Map<string, BorrowerData> = new Map();

  public async save(borrower: Borrower): Promise<void> {
    const data: BorrowerData = {
      id: borrower.getId().getValue(),
      createdAt: borrower.getCreatedAt().toISOString()
    };

    this.borrowers.set(borrower.getId().getValue(), data);
  }

  public async findById(id: BorrowerId): Promise<Borrower | null> {
    const data = this.borrowers.get(id.getValue());
    if (!data) {
      return null;
    }

    return new Borrower(
      new BorrowerId(data.id),
      new Date(data.createdAt)
    );
  }

  public async findAll(): Promise<Borrower[]> {
    const borrowers: Borrower[] = [];
    
    for (const data of this.borrowers.values()) {
      borrowers.push(new Borrower(
        new BorrowerId(data.id),
        new Date(data.createdAt)
      ));
    }

    return borrowers;
  }

  public async delete(id: BorrowerId): Promise<void> {
    this.borrowers.delete(id.getValue());
  }
}