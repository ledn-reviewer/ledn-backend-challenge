import { Loan } from '../entities/loan';
import { Amount } from '../value-objects/amount';
import { LtvRatio } from '../value-objects/ltv-ratio';

export interface LoanRiskAssessmentConfig {
  activationThreshold: number;
  liquidationThreshold: number;
  minimumCollateralRatio: number;
}

export class LoanRiskAssessmentService {
  constructor(private readonly config: LoanRiskAssessmentConfig) {}

  public canActivateLoan(loan: Loan, currentPrice: Amount): boolean {
    return loan.canActivate(currentPrice, this.config.activationThreshold);
  }

  public shouldLiquidateLoan(loan: Loan, currentPrice: Amount): boolean {
    return loan.shouldLiquidate(currentPrice, this.config.liquidationThreshold);
  }

  public calculateLtv(loan: Loan, currentPrice: Amount): LtvRatio {
    return loan.calculateLtv(currentPrice);
  }

  public isCollateralSufficient(loanAmount: Amount, collateralAmount: Amount): boolean {
    const requiredCollateral = loanAmount.multiply(this.config.minimumCollateralRatio);
    return collateralAmount.isGreaterThan(requiredCollateral) || collateralAmount.equals(requiredCollateral);
  }
}