import { Loan, LoanStatus } from '../../domain/entities/loan';
import { LoanId } from '../../domain/value-objects/loan-id';
import { BorrowerId } from '../../domain/value-objects/borrower-id';
import { Amount } from '../../domain/value-objects/amount';
import { AssetType } from '../../domain/value-objects/asset-type';
import { LoanRepository } from '../../domain/repositories/loan-repository';

interface LoanData {
  id: string;
  borrowerId: string;
  amount: number;
  collateralAmount: number;
  assetType: string;
  status: LoanStatus;
  createdAt: string;
  lastModified: string;
}

export class InMemoryLoanRepository implements LoanRepository {
  private loans: Map<string, LoanData> = new Map();

  public async save(loan: Loan): Promise<void> {
    const data: LoanData = {
      id: loan.getId().getValue(),
      borrowerId: loan.getBorrowerId().getValue(),
      amount: loan.getAmount().getValue(),
      collateralAmount: loan.getCollateralAmount().getValue(),
      assetType: loan.getAssetType().toString(),
      status: loan.getStatus(),
      createdAt: loan.getCreatedAt().toISOString(),
      lastModified: loan.getLastModified().toISOString()
    };

    this.loans.set(loan.getId().getValue(), data);
  }

  public async findById(id: LoanId): Promise<Loan | null> {
    const data = this.loans.get(id.getValue());
    if (!data) {
      return null;
    }

    return this.mapToLoan(data);
  }

  public async findByBorrowerId(borrowerId: BorrowerId): Promise<Loan[]> {
    const loans: Loan[] = [];
    
    for (const data of this.loans.values()) {
      if (data.borrowerId === borrowerId.getValue()) {
        loans.push(this.mapToLoan(data));
      }
    }

    return loans;
  }

  public async findAll(): Promise<Loan[]> {
    const loans: Loan[] = [];
    
    for (const data of this.loans.values()) {
      loans.push(this.mapToLoan(data));
    }

    return loans;
  }

  public async delete(id: LoanId): Promise<void> {
    this.loans.delete(id.getValue());
  }

  private mapToLoan(data: LoanData): Loan {
    return Loan.reconstruct(
      new LoanId(data.id),
      new BorrowerId(data.borrowerId),
      new Amount(data.amount),
      new Amount(data.collateralAmount),
      new AssetType(data.assetType),
      data.status,
      new Date(data.createdAt),
      new Date(data.lastModified)
    );
  }
}