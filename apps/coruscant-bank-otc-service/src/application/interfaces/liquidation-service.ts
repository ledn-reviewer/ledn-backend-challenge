import { LoanApplicationSubmitted } from '../../domain/events/loan-application-submitted';
import { CollateralTopUpSubmitted } from '../../domain/events/collateral-top-up-submitted';

export interface LiquidationService {
  forwardLoanApplication(event: LoanApplicationSubmitted): Promise<void>;
  forwardCollateralTopUp(event: CollateralTopUpSubmitted): Promise<void>;
}