export class Amount {
  private readonly value: number;

  constructor(value: number | string) {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numericValue) || numericValue < 0) {
      throw new Error('Amount must be a non-negative number');
    }
    
    this.value = Math.round(numericValue * 100) / 100; // Round to 2 decimal places
  }

  public getValue(): number {
    return this.value;
  }

  public toString(): string {
    return this.value.toFixed(2);
  }

  public add(other: Amount): Amount {
    return new Amount(this.value + other.value);
  }

  public subtract(other: Amount): Amount {
    if (this.value < other.value) {
      throw new Error('Cannot subtract amount greater than current value');
    }
    return new Amount(this.value - other.value);
  }

  public multiply(factor: number): Amount {
    return new Amount(this.value * factor);
  }

  public divide(divisor: number): Amount {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    return new Amount(this.value / divisor);
  }

  public isGreaterThan(other: Amount): boolean {
    return this.value > other.value;
  }

  public isLessThan(other: Amount): boolean {
    return this.value < other.value;
  }

  public equals(other: Amount): boolean {
    return this.value === other.value;
  }
}