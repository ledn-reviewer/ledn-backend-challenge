export class BorrowerId {
  private readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('BorrowerId cannot be empty');
    }
    
    this.value = value.trim();
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: BorrowerId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}