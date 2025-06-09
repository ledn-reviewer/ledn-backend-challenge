import { Amount } from './amount';

describe('Amount', () => {
  describe('constructor', () => {
    it('should create amount from number', () => {
      const amount = new Amount(100.50);
      expect(amount.getValue()).toBe(100.5);
    });

    it('should create amount from string', () => {
      const amount = new Amount('100.50');
      expect(amount.getValue()).toBe(100.5);
    });

    it('should round to 2 decimal places', () => {
      const amount = new Amount(100.999);
      expect(amount.getValue()).toBe(101);
    });

    it('should throw error for negative amount', () => {
      expect(() => new Amount(-1)).toThrow('Amount must be a non-negative number');
    });

    it('should throw error for NaN', () => {
      expect(() => new Amount('invalid')).toThrow('Amount must be a non-negative number');
    });
  });

  describe('arithmetic operations', () => {
    it('should add amounts correctly', () => {
      const amount1 = new Amount(100);
      const amount2 = new Amount(50);
      const result = amount1.add(amount2);
      
      expect(result.getValue()).toBe(150);
    });

    it('should subtract amounts correctly', () => {
      const amount1 = new Amount(100);
      const amount2 = new Amount(30);
      const result = amount1.subtract(amount2);
      
      expect(result.getValue()).toBe(70);
    });

    it('should throw error when subtracting larger amount', () => {
      const amount1 = new Amount(50);
      const amount2 = new Amount(100);
      
      expect(() => amount1.subtract(amount2)).toThrow();
    });

    it('should multiply amount correctly', () => {
      const amount = new Amount(100);
      const result = amount.multiply(2.5);
      
      expect(result.getValue()).toBe(250);
    });

    it('should divide amount correctly', () => {
      const amount = new Amount(100);
      const result = amount.divide(4);
      
      expect(result.getValue()).toBe(25);
    });

    it('should throw error when dividing by zero', () => {
      const amount = new Amount(100);
      
      expect(() => amount.divide(0)).toThrow('Cannot divide by zero');
    });
  });

  describe('comparison operations', () => {
    it('should compare amounts correctly', () => {
      const amount1 = new Amount(100);
      const amount2 = new Amount(50);
      const amount3 = new Amount(100);
      
      expect(amount1.isGreaterThan(amount2)).toBe(true);
      expect(amount2.isLessThan(amount1)).toBe(true);
      expect(amount1.equals(amount3)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should format as currency string', () => {
      const amount = new Amount(100.5);
      expect(amount.toString()).toBe('100.50');
    });
  });
});