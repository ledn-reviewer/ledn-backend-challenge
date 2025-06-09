import axios, { AxiosInstance } from 'axios';
import { LiquidationService } from '../../application/interfaces/liquidation-service';
import { LoanApplicationSubmitted } from '../../domain/events/loan-application-submitted';
import { CollateralTopUpSubmitted } from '../../domain/events/collateral-top-up-submitted';
import logger from '../../utils/logger';

export class HttpLiquidationService implements LiquidationService {
  private readonly httpClient: AxiosInstance;

  constructor(baseUrl: string) {
    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  public async forwardLoanApplication(event: LoanApplicationSubmitted): Promise<void> {
    try {
      const payload = {
        requestId: event.requestId.getValue(),
        loanId: event.loanId.getValue(),
        borrowerId: event.borrowerId.getValue(),
        amount: event.amount.toString(),
        collateralAmount: event.collateralAmount.toString(),
        assetType: event.assetType.toString()
      };

      await this.httpClient.post('/loan-applications', payload);
      
      logger.info({
        requestId: event.requestId.getValue(),
        loanId: event.loanId.getValue()
      }, 'Loan application forwarded to liquidation service');
    } catch (error) {
      logger.error({ 
        error, 
        requestId: event.requestId.getValue(),
        loanId: event.loanId.getValue()
      }, 'Failed to forward loan application');
      throw error;
    }
  }

  public async forwardCollateralTopUp(event: CollateralTopUpSubmitted): Promise<void> {
    try {
      const payload = {
        requestId: event.requestId.getValue(),
        loanId: event.loanId.getValue(),
        borrowerId: event.borrowerId.getValue(),
        amount: event.amount.toString(),
        assetType: event.assetType.toString()
      };

      await this.httpClient.post('/collateral-top-ups', payload);
      
      logger.info({
        requestId: event.requestId.getValue(),
        loanId: event.loanId.getValue()
      }, 'Collateral top-up forwarded to liquidation service');
    } catch (error) {
      logger.error({ 
        error, 
        requestId: event.requestId.getValue(),
        loanId: event.loanId.getValue()
      }, 'Failed to forward collateral top-up');
      throw error;
    }
  }
}