import { LoanId } from '../value-objects/loan-id';
import { BorrowerId } from '../value-objects/borrower-id';
import { Amount } from '../value-objects/amount';
import { AssetType } from '../value-objects/asset-type';
import { LtvRatio } from '../value-objects/ltv-ratio';

export enum LoanStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  LIQUIDATED = 'LIQUIDATED',
  REPAID = 'REPAID'
}

export class Loan {
  private constructor(
    private readonly id: LoanId,
    private readonly borrowerId: BorrowerId,
    private readonly amount: Amount,
    private collateralAmount: Amount,
    private readonly assetType: AssetType,
    private status: LoanStatus,
    private readonly createdAt: Date,
    private lastModified: Date
  ) {}

  public static create(
    id: LoanId,
    borrowerId: BorrowerId,
    amount: Amount,
    collateralAmount: Amount,
    assetType: AssetType
  ): Loan {
    const now = new Date();
    return new Loan(
      id,
      borrowerId,
      amount,
      collateralAmount,
      assetType,
      LoanStatus.PENDING,
      now,
      now
    );
  }

  public static reconstruct(
    id: LoanId,
    borrowerId: BorrowerId,
    amount: Amount,
    collateralAmount: Amount,
    assetType: AssetType,
    status: LoanStatus,
    createdAt: Date,
    lastModified: Date
  ): Loan {
    return new Loan(
      id,
      borrowerId,
      amount,
      collateralAmount,
      assetType,
      status,
      createdAt,
      lastModified
    );
  }

  public getId(): LoanId {
    return this.id;
  }

  public getBorrowerId(): BorrowerId {
    return this.borrowerId;
  }

  public getAmount(): Amount {
    return this.amount;
  }

  public getCollateralAmount(): Amount {
    return this.collateralAmount;
  }

  public getAssetType(): AssetType {
    return this.assetType;
  }

  public getStatus(): LoanStatus {
    return this.status;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getLastModified(): Date {
    return this.lastModified;
  }

  public calculateLtv(currentPrice: Amount): LtvRatio {
    const collateralValue = this.collateralAmount.multiply(currentPrice.getValue());
    return new LtvRatio(this.amount, collateralValue);
  }

  public canActivate(currentPrice: Amount, activationThreshold: number = 50): boolean {
    if (this.status !== LoanStatus.PENDING) {
      return false;
    }
    
    const ltv = this.calculateLtv(currentPrice);
    return ltv.isBelowThreshold(activationThreshold);
  }

  public shouldLiquidate(currentPrice: Amount, liquidationThreshold: number = 80): boolean {
    if (this.status !== LoanStatus.ACTIVE) {
      return false;
    }
    
    const ltv = this.calculateLtv(currentPrice);
    return ltv.isAboveThreshold(liquidationThreshold);
  }

  public activate(): void {
    if (this.status !== LoanStatus.PENDING) {
      throw new Error(`Cannot activate loan in status: ${this.status}`);
    }
    
    this.status = LoanStatus.ACTIVE;
    this.lastModified = new Date();
  }

  public liquidate(): void {
    if (this.status !== LoanStatus.ACTIVE) {
      throw new Error(`Cannot liquidate loan in status: ${this.status}`);
    }
    
    this.status = LoanStatus.LIQUIDATED;
    this.lastModified = new Date();
  }

  public addCollateral(amount: Amount): void {
    this.collateralAmount = this.collateralAmount.add(amount);
    this.lastModified = new Date();
  }

  public repay(): void {
    if (this.status !== LoanStatus.ACTIVE) {
      throw new Error(`Cannot repay loan in status: ${this.status}`);
    }
    
    this.status = LoanStatus.REPAID;
    this.lastModified = new Date();
  }
}