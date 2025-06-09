import { Amount } from './amount';

export class LtvRatio {
  private readonly value: number;

  constructor(loanAmount: Amount, collateralValue: Amount) {
    if (collateralValue.getValue() === 0) {
      throw new Error('Collateral value cannot be zero when calculating LTV');
    }
    
    this.value = (loanAmount.getValue() / collateralValue.getValue()) * 100;
  }

  public static fromPercentage(percentage: number): LtvRatio {
    if (percentage < 0) {
      throw new Error('LTV percentage cannot be negative');
    }
    
    // Create a dummy LtvRatio with the percentage value
    const ltv = Object.create(LtvRatio.prototype);
    ltv.value = percentage;
    return ltv;
  }

  public getPercentage(): number {
    return this.value;
  }

  public isAboveThreshold(threshold: number): boolean {
    return this.value > threshold;
  }

  public isBelowThreshold(threshold: number): boolean {
    return this.value < threshold;
  }

  public equals(other: LtvRatio): boolean {
    return Math.abs(this.value - other.value) < 0.01; // Allow for small floating point differences
  }

  public toString(): string {
    return `${this.value.toFixed(2)}%`;
  }
}