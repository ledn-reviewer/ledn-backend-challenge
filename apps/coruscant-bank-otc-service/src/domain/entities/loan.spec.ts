import { Loan, LoanStatus } from './loan';
import { LoanId } from '../value-objects/loan-id';
import { BorrowerId } from '../value-objects/borrower-id';
import { Amount } from '../value-objects/amount';
import { AssetType } from '../value-objects/asset-type';

describe('Loan', () => {
  const loanId = new LoanId('loan-123');
  const borrowerId = new BorrowerId('borrower-456');
  const loanAmount = new Amount(1000);
  const collateralAmount = new Amount(2000);
  const assetType = AssetType.BSK();

  describe('create', () => {
    it('should create a loan with pending status', () => {
      const loan = Loan.create(loanId, borrowerId, loanAmount, collateralAmount, assetType);
      
      expect(loan.getId()).toBe(loanId);
      expect(loan.getBorrowerId()).toBe(borrowerId);
      expect(loan.getAmount()).toBe(loanAmount);
      expect(loan.getCollateralAmount()).toBe(collateralAmount);
      expect(loan.getAssetType()).toBe(assetType);
      expect(loan.getStatus()).toBe(LoanStatus.PENDING);
    });
  });

  describe('calculateLtv', () => {
    it('should calculate LTV ratio correctly', () => {
      const loan = Loan.create(loanId, borrowerId, loanAmount, collateralAmount, assetType);
      const currentPrice = new Amount(0.5); // $0.5 per BSK unit
      
      const ltv = loan.calculateLtv(currentPrice);
      
      // $1000 loan / (2000 units * $0.5/unit) = $1000 / $1000 = 100% LTV
      expect(ltv.getPercentage()).toBe(100);
    });
  });

  describe('canActivate', () => {
    it('should return true when LTV is below activation threshold', () => {
      const loan = Loan.create(loanId, borrowerId, loanAmount, collateralAmount, assetType);
      const currentPrice = new Amount(1); // 1000 / (2000 * 1) = 50% LTV
      
      const canActivate = loan.canActivate(currentPrice, 60); // 60% threshold
      
      expect(canActivate).toBe(true); // 50% < 60%
    });

    it('should return false when LTV is above activation threshold', () => {
      const loan = Loan.create(loanId, borrowerId, loanAmount, collateralAmount, assetType);
      const currentPrice = new Amount(0.4); // 1000 / (2000 * 0.4) = 125% LTV
      
      const canActivate = loan.canActivate(currentPrice, 100); // 100% threshold
      
      expect(canActivate).toBe(false); // 125% > 100%
    });

    it('should return false when loan is not pending', () => {
      const loan = Loan.create(loanId, borrowerId, loanAmount, collateralAmount, assetType);
      loan.activate();
      const currentPrice = new Amount(10);
      
      const canActivate = loan.canActivate(currentPrice, 50);
      
      expect(canActivate).toBe(false);
    });
  });

  describe('shouldLiquidate', () => {
    it('should return true when LTV exceeds liquidation threshold', () => {
      const loan = Loan.create(loanId, borrowerId, loanAmount, collateralAmount, assetType);
      loan.activate();
      const currentPrice = new Amount(0.6); // 1000 / (2000 * 0.6) = 83.33% LTV
      
      const shouldLiquidate = loan.shouldLiquidate(currentPrice, 80);
      
      expect(shouldLiquidate).toBe(true); // 83.33% > 80% threshold
    });

    it('should return false when loan is not active', () => {
      const loan = Loan.create(loanId, borrowerId, loanAmount, collateralAmount, assetType);
      const currentPrice = new Amount(0.1);
      
      const shouldLiquidate = loan.shouldLiquidate(currentPrice, 80);
      
      expect(shouldLiquidate).toBe(false);
    });
  });

  describe('activate', () => {
    it('should activate pending loan', () => {
      const loan = Loan.create(loanId, borrowerId, loanAmount, collateralAmount, assetType);
      
      loan.activate();
      
      expect(loan.getStatus()).toBe(LoanStatus.ACTIVE);
    });

    it('should throw error when trying to activate non-pending loan', () => {
      const loan = Loan.create(loanId, borrowerId, loanAmount, collateralAmount, assetType);
      loan.activate();
      
      expect(() => loan.activate()).toThrow('Cannot activate loan in status: ACTIVE');
    });
  });

  describe('liquidate', () => {
    it('should liquidate active loan', () => {
      const loan = Loan.create(loanId, borrowerId, loanAmount, collateralAmount, assetType);
      loan.activate();
      
      loan.liquidate();
      
      expect(loan.getStatus()).toBe(LoanStatus.LIQUIDATED);
    });

    it('should throw error when trying to liquidate non-active loan', () => {
      const loan = Loan.create(loanId, borrowerId, loanAmount, collateralAmount, assetType);
      
      expect(() => loan.liquidate()).toThrow('Cannot liquidate loan in status: PENDING');
    });
  });

  describe('addCollateral', () => {
    it('should add collateral amount', () => {
      const loan = Loan.create(loanId, borrowerId, loanAmount, collateralAmount, assetType);
      const additionalCollateral = new Amount(500);
      
      loan.addCollateral(additionalCollateral);
      
      expect(loan.getCollateralAmount().getValue()).toBe(2500);
    });
  });
});