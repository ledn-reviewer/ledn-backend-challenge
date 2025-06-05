import { PublishCommand } from '@aws-sdk/client-sns';
import * as publisherModule from './publisher';
import { snsClient } from '../../factories/snsClient';
import { EventHistoryStore } from '../../utils/event-store';

// Mock the modules
jest.mock('../../factories/snsClient');
jest.mock('../../utils/event-store');

describe('publishLoanEvent', () => {
  let mockSend: jest.Mock;
  let mockAddEvent: jest.Mock;
  let mockGetInstance: jest.Mock;

  const testMessage = {
    eventType: 'LOAN_APPLICATION',
    requestId: 'test-req',
    data: { foo: 'bar' },
    timestamp: new Date().toISOString()
  } as const;

  beforeEach(() => {
    // Setup Jest mocks
    mockSend = jest.fn().mockResolvedValue({ MessageId: 'msg-123' });
    mockAddEvent = jest.fn();
    mockGetInstance = jest.fn().mockReturnValue({ addEvent: mockAddEvent });

    // Apply mocks
    (snsClient.send as jest.Mock) = mockSend;
    (EventHistoryStore.getInstance as jest.Mock) = mockGetInstance;

    // Clear environment variables
    delete process.env.ENABLE_SELF_PUBLISHING;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should record event and skip publishing when disabled', async () => {
    process.env.ENABLE_SELF_PUBLISHING = 'false';
    const messageId = await publisherModule.publishLoanEvent(testMessage);
    expect(mockAddEvent).toHaveBeenCalledTimes(1);
    expect(mockSend).not.toHaveBeenCalled();
    expect(typeof messageId).toBe('string');
  });

  it('should publish and return messageId when enabled', async () => {
    process.env.ENABLE_SELF_PUBLISHING = 'true';
    const messageId = await publisherModule.publishLoanEvent(testMessage);
    expect(mockAddEvent).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledTimes(1);

    // Verify PublishCommand usage
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(PublishCommand);
    expect(messageId).toBe('msg-123');
  });
});
