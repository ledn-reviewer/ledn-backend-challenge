import { EventPublisher } from './event-publisher';
import { SNSPublisher } from './publisher';
import { LoanEventMessage } from './event-publisher.types';
import { EventHistoryStore } from '../../utils/event-store';

// Mock dependencies
jest.mock('./publisher');
jest.mock('../../utils/event-store');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid-123' }));

describe('EventPublisher', () => {
  let eventPublisher: EventPublisher;
  let mockSNSPublisher: jest.Mocked<SNSPublisher>;
  let mockEventStore: jest.Mocked<EventHistoryStore>;
  let mockAddEvent: jest.Mock;
  let originalEnv: NodeJS.ProcessEnv;

  const testMessage: LoanEventMessage = {
    eventType: 'LOAN_APPLICATION',
    requestId: 'test-req-123',
    data: { foo: 'bar' },
    timestamp: '2023-05-22T12:34:56Z'
  };

  beforeEach(() => {
    originalEnv = { ...process.env };

    // Setup mocks
    mockAddEvent = jest.fn();
    mockEventStore = {
      addEvent: mockAddEvent
    } as unknown as jest.Mocked<EventHistoryStore>;

    mockSNSPublisher = {
      publish: jest.fn().mockResolvedValue('msg-123')
    } as unknown as jest.Mocked<SNSPublisher>;

    // Mock the constructor of SNSPublisher
    (SNSPublisher as jest.Mock).mockImplementation(() => mockSNSPublisher);

    // Mock EventHistoryStore.getInstance()
    (EventHistoryStore.getInstance as jest.Mock).mockReturnValue(mockEventStore);

    // Create the EventPublisher instance
    eventPublisher = new EventPublisher();

    // Clear environment variables
    delete process.env.ENABLE_SELF_PUBLISHING;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('should record event and publish when self-publishing is disabled', async () => {
    process.env.ENABLE_SELF_PUBLISHING = 'false';

    const messageId = await eventPublisher.publishEvent(testMessage);

    // Verify event was recorded
    expect(mockAddEvent).toHaveBeenCalledWith({
      id: 'mock-uuid-123',
      type: 'LOAN_APPLICATION',
      direction: 'OUTBOUND',
      data: testMessage,
      timestamp: expect.any(String)
    });

    // Verify message was published
    expect(mockSNSPublisher.publish).toHaveBeenCalledWith(
      expect.any(String),
      testMessage
    );

    expect(messageId).toBe('msg-123');
  });

  it('should record event but skip publishing when self-publishing is enabled', async () => {
    process.env.ENABLE_SELF_PUBLISHING = 'true';

    const messageId = await eventPublisher.publishEvent(testMessage);

    // Verify event was recorded
    expect(mockAddEvent).toHaveBeenCalledWith({
      id: 'mock-uuid-123',
      type: 'LOAN_APPLICATION',
      direction: 'OUTBOUND',
      data: testMessage,
      timestamp: expect.any(String)
    });

    // Verify message was NOT published to SNS
    expect(mockSNSPublisher.publish).not.toHaveBeenCalled();

    // Should return the UUID as a pseudo-message ID
    expect(messageId).toBe('mock-uuid-123');
  });

  it('should handle errors during publishing', async () => {
    process.env.ENABLE_SELF_PUBLISHING = 'false';

    // Setup error scenario
    mockSNSPublisher.publish.mockRejectedValue(new Error('SNS publish error'));

    await expect(eventPublisher.publishEvent(testMessage)).rejects.toThrow('SNS publish error');

    // Verify event was still recorded despite the error
    expect(mockAddEvent).toHaveBeenCalled();
  });
});
