import { Loan } from '../../domain/entities/loan';
import { Borrower } from '../../domain/entities/borrower';
import { LoanId } from '../../domain/value-objects/loan-id';
import { BorrowerId } from '../../domain/value-objects/borrower-id';
import { Amount } from '../../domain/value-objects/amount';
import { AssetType } from '../../domain/value-objects/asset-type';
import { RequestId } from '../../domain/value-objects/request-id';
import { LoanApplicationSubmitted } from '../../domain/events/loan-application-submitted';
import { LoanRepository } from '../../domain/repositories/loan-repository';
import { BorrowerRepository } from '../../domain/repositories/borrower-repository';
import { LoanRiskAssessmentService } from '../../domain/services/loan-risk-assessment-service';
import { EventPublisher } from '../interfaces/event-publisher';
import { LiquidationService } from '../interfaces/liquidation-service';
import { InsufficientCollateralException } from '../../domain/exceptions/loan-exceptions';
import { ExternalServiceException } from '../exceptions/application-exceptions';

export interface SubmitLoanApplicationRequest {
  requestId: string;
  loanId: string;
  borrowerId: string;
  amount: string;
  collateralAmount: string;
  assetType: string;
}

export interface SubmitLoanApplicationResponse {
  requestId: string;
  loanId: string;
  timestamp: string;
  published: boolean;
}

export class SubmitLoanApplicationUseCase {
  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly borrowerRepository: BorrowerRepository,
    private readonly riskAssessmentService: LoanRiskAssessmentService,
    private readonly eventPublisher: EventPublisher,
    private readonly liquidationService: LiquidationService,
    private readonly selfPublishingEnabled: boolean
  ) {}

  public async execute(request: SubmitLoanApplicationRequest): Promise<SubmitLoanApplicationResponse> {
    const requestId = new RequestId(request.requestId);
    const loanId = new LoanId(request.loanId);
    const borrowerId = new BorrowerId(request.borrowerId);
    const amount = new Amount(request.amount);
    const collateralAmount = new Amount(request.collateralAmount);
    const assetType = new AssetType(request.assetType);

    // Validate collateral is sufficient
    if (!this.riskAssessmentService.isCollateralSufficient(amount, collateralAmount)) {
      throw new InsufficientCollateralException(
        amount.multiply(2).getValue(),
        collateralAmount.getValue()
      );
    }

    // Ensure borrower exists
    let borrower = await this.borrowerRepository.findById(borrowerId);
    if (!borrower) {
      borrower = new Borrower(borrowerId);
      await this.borrowerRepository.save(borrower);
    }

    // Create and save loan
    const loan = Loan.create(loanId, borrowerId, amount, collateralAmount, assetType);
    await this.loanRepository.save(loan);

    // Create domain event
    const event = new LoanApplicationSubmitted(
      requestId,
      loanId,
      borrowerId,
      amount,
      collateralAmount,
      assetType
    );

    // Publish or forward based on configuration
    if (this.selfPublishingEnabled) {
      await this.eventPublisher.publish(event);
    } else {
      await this.liquidationService.forwardLoanApplication(event);
    }

    return {
      requestId: requestId.getValue(),
      loanId: loanId.getValue(),
      timestamp: event.occurredOn.toISOString(),
      published: this.selfPublishingEnabled
    };
  }
}