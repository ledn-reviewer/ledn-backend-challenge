import { LoanId } from '../../domain/value-objects/loan-id';
import { BorrowerId } from '../../domain/value-objects/borrower-id';
import { Amount } from '../../domain/value-objects/amount';
import { AssetType } from '../../domain/value-objects/asset-type';
import { RequestId } from '../../domain/value-objects/request-id';
import { CollateralTopUpSubmitted } from '../../domain/events/collateral-top-up-submitted';
import { LoanRepository } from '../../domain/repositories/loan-repository';
import { EventPublisher } from '../interfaces/event-publisher';
import { LiquidationService } from '../interfaces/liquidation-service';
import { LoanNotFoundException, BorrowerMismatchException } from '../../domain/exceptions/loan-exceptions';

export interface SubmitCollateralTopUpRequest {
  requestId: string;
  loanId: string;
  borrowerId: string;
  amount: string;
  assetType: string;
}

export interface SubmitCollateralTopUpResponse {
  requestId: string;
  loanId: string;
  timestamp: string;
  published: boolean;
}

export class SubmitCollateralTopUpUseCase {
  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly liquidationService: LiquidationService,
    private readonly selfPublishingEnabled: boolean
  ) {}

  public async execute(request: SubmitCollateralTopUpRequest): Promise<SubmitCollateralTopUpResponse> {
    const requestId = new RequestId(request.requestId);
    const loanId = new LoanId(request.loanId);
    const borrowerId = new BorrowerId(request.borrowerId);
    const amount = new Amount(request.amount);
    const assetType = new AssetType(request.assetType);

    // Verify loan exists
    const loan = await this.loanRepository.findById(loanId);
    if (!loan) {
      throw new LoanNotFoundException(loanId);
    }

    // Verify borrower owns the loan
    if (!loan.getBorrowerId().equals(borrowerId)) {
      throw new BorrowerMismatchException(loanId, borrowerId, loan.getBorrowerId());
    }

    // Add collateral to loan
    loan.addCollateral(amount);
    await this.loanRepository.save(loan);

    // Create domain event
    const event = new CollateralTopUpSubmitted(
      requestId,
      loanId,
      borrowerId,
      amount,
      assetType
    );

    // Publish or forward based on configuration
    if (this.selfPublishingEnabled) {
      await this.eventPublisher.publish(event);
    } else {
      await this.liquidationService.forwardCollateralTopUp(event);
    }

    return {
      requestId: requestId.getValue(),
      loanId: loanId.getValue(),
      timestamp: event.occurredOn.toISOString(),
      published: this.selfPublishingEnabled
    };
  }
}