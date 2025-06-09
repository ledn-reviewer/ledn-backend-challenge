export class LoanId {
  private readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('LoanId cannot be empty');
    }
    
    this.value = value.trim();
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: LoanId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}