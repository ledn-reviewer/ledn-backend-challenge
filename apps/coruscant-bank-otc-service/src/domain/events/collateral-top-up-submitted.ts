import { DomainEvent } from './domain-event';
import { RequestId } from '../value-objects/request-id';
import { LoanId } from '../value-objects/loan-id';
import { BorrowerId } from '../value-objects/borrower-id';
import { Amount } from '../value-objects/amount';
import { AssetType } from '../value-objects/asset-type';

export class CollateralTopUpSubmitted extends DomainEvent {
  public static readonly EVENT_TYPE = 'COLLATERAL_TOP_UP_SUBMITTED';

  constructor(
    requestId: RequestId,
    public readonly loanId: LoanId,
    public readonly borrowerId: BorrowerId,
    public readonly amount: Amount,
    public readonly assetType: AssetType
  ) {
    super(requestId, CollateralTopUpSubmitted.EVENT_TYPE);
  }

  public toPrimitives(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      requestId: this.requestId.getValue(),
      occurredOn: this.occurredOn.toISOString(),
      data: {
        loanId: this.loanId.getValue(),
        borrowerId: this.borrowerId.getValue(),
        amount: this.amount.toString(),
        assetType: this.assetType.toString()
      }
    };
  }
}