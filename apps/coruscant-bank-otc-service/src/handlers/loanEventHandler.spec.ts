import { LoanEventHandler, LoanEventStore } from './loanEventHandler';
import { EventHistoryStore } from '../utils/event-store';

// Mock the dependencies
jest.mock('../utils/event-store');

describe('LoanEventHandler', () => {
  let handler: LoanEventHandler;
  let mockHistoryAdd: jest.Mock;
  let mockStoreAdd: jest.Mock;
  let mockProcessApp: jest.SpyInstance;
  let mockProcessTopUp: jest.SpyInstance;
  let mockLoanEventStore: jest.Mocked<LoanEventStore>;
  let mockEventHistoryStore: jest.Mocked<EventHistoryStore>;

  beforeEach(() => {
    // Mock EventHistoryStore
    mockHistoryAdd = jest.fn();
    mockEventHistoryStore = {
      addEvent: mockHistoryAdd,
    } as any;
    (EventHistoryStore.getInstance as jest.Mock).mockReturnValue(mockEventHistoryStore);

    // Mock LoanEventStore
    mockStoreAdd = jest.fn();
    mockLoanEventStore = {
      addEvent: mockStoreAdd,
    } as any;
    jest.spyOn(LoanEventStore, 'getInstance').mockReturnValue(mockLoanEventStore);

    // Create handler instance
    handler = new LoanEventHandler();

    // Mock private processing methods
    mockProcessApp = jest.spyOn(handler as any, 'processLoanApplication').mockResolvedValue(undefined);
    mockProcessTopUp = jest.spyOn(handler as any, 'processCollateralTopUp').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process a LOAN_APPLICATION notification', async () => {
    const payload = {
      Type: 'Notification',
      Message: JSON.stringify({ eventType: 'LOAN_APPLICATION', requestId: 'r1', data: { foo: 'bar' }, timestamp: 'ts' })
    };

    await handler.handleMessage(JSON.stringify(payload));

    // Should add to in-memory store and history
    expect(mockStoreAdd).toHaveBeenCalledTimes(1);
    expect(mockHistoryAdd).toHaveBeenCalledTimes(1);
    // Should call processLoanApplication
    expect(mockProcessApp).toHaveBeenCalledTimes(1);
  });

  it('should process a COLLATERAL_TOP_UP message', async () => {
    const payload = { eventType: 'COLLATERAL_TOP_UP', requestId: 'r2', data: { baz: 123 }, timestamp: 'ts2' };

    await handler.handleMessage(JSON.stringify(payload));

    expect(mockStoreAdd).toHaveBeenCalledTimes(1);
    expect(mockHistoryAdd).toHaveBeenCalledTimes(1);
    expect(mockProcessTopUp).toHaveBeenCalledTimes(1);
  });
});
