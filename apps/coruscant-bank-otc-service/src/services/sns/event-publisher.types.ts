
/**
 * Interface for loan event message
 */
export interface LoanEventMessage extends Record<string, unknown> {
  eventType: 'LOAN_APPLICATION' | 'COLLATERAL_TOP_UP';
  requestId: string;
  data: Record<string, unknown>;
  timestamp: string;
}
