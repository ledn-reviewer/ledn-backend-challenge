import { EventHistoryStore, EventData } from './event-store';
import logger from './logger';

// Mock logger to avoid output during tests
jest.mock('./logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('EventHistoryStore', () => {
  let eventStore: EventHistoryStore;

  beforeEach(() => {
    // Reset singleton instance for each test
    (EventHistoryStore as any).instance = undefined;
    eventStore = EventHistoryStore.getInstance();
    eventStore.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    eventStore.clear();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const store1 = EventHistoryStore.getInstance();
      const store2 = EventHistoryStore.getInstance();
      
      expect(store1).toBe(store2);
      expect(store1).toBeInstanceOf(EventHistoryStore);
    });

    it('should use default maxInMemoryEvents when no options provided', () => {
      const store = EventHistoryStore.getInstance();
      
      // Add 1001 events to test default limit
      for (let i = 0; i < 1001; i++) {
        store.addEvent({
          id: `event-${i}`,
          type: 'TEST_EVENT',
          direction: 'OUTBOUND',
          data: { index: i },
          timestamp: new Date().toISOString()
        });
      }
      
      // Should only keep the last 1000 events (default limit)
      const events = store.getEvents();
      expect(events).toHaveLength(1000);
      expect(events[0].data.index).toBe(1);
      expect(events[999].data.index).toBe(1000);
    });

    it('should use custom maxInMemoryEvents when provided', () => {
      // Reset singleton to test with options
      (EventHistoryStore as any).instance = undefined;
      const store = EventHistoryStore.getInstance({ maxInMemoryEvents: 5 });
      
      // Add 7 events to test custom limit
      for (let i = 0; i < 7; i++) {
        store.addEvent({
          id: `event-${i}`,
          type: 'TEST_EVENT',
          direction: 'OUTBOUND',
          data: { index: i },
          timestamp: new Date().toISOString()
        });
      }
      
      // Should only keep the last 5 events
      const events = store.getEvents();
      expect(events).toHaveLength(5);
      expect(events[0].data.index).toBe(2);
      expect(events[4].data.index).toBe(6);
    });
  });

  describe('addEvent', () => {
    it('should add event to store', () => {
      const event: EventData = {
        id: 'test-event-1',
        type: 'LOAN_APPLICATION',
        direction: 'OUTBOUND',
        data: { amount: '1000.00' },
        timestamp: '2023-01-01T00:00:00Z'
      };

      eventStore.addEvent(event);
      
      const events = eventStore.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);
      expect(logger.debug).toHaveBeenCalledWith({ event }, 'Event added to history');
    });

    it('should add multiple events in order', () => {
      const events: EventData[] = [
        {
          id: 'event-1',
          type: 'LOAN_APPLICATION',
          direction: 'OUTBOUND',
          data: {},
          timestamp: '2023-01-01T00:00:00Z'
        },
        {
          id: 'event-2',
          type: 'COLLATERAL_TOP_UP',
          direction: 'INBOUND',
          data: {},
          timestamp: '2023-01-01T01:00:00Z'
        }
      ];

      events.forEach(event => eventStore.addEvent(event));
      
      const storedEvents = eventStore.getEvents();
      expect(storedEvents).toHaveLength(2);
      expect(storedEvents[0].id).toBe('event-1');
      expect(storedEvents[1].id).toBe('event-2');
    });

    it('should trim events when exceeding maxInMemoryEvents', () => {
      // Reset with small limit for testing
      (EventHistoryStore as any).instance = undefined;
      const store = EventHistoryStore.getInstance({ maxInMemoryEvents: 3 });
      
      // Add 5 events
      for (let i = 1; i <= 5; i++) {
        store.addEvent({
          id: `event-${i}`,
          type: 'TEST_EVENT',
          direction: 'OUTBOUND',
          data: { index: i },
          timestamp: new Date().toISOString()
        });
      }
      
      const events = store.getEvents();
      expect(events).toHaveLength(3);
      // Should keep the last 3 events (3, 4, 5)
      expect(events[0].data.index).toBe(3);
      expect(events[1].data.index).toBe(4);
      expect(events[2].data.index).toBe(5);
    });
  });

  describe('getEvents', () => {
    beforeEach(() => {
      // Add sample events for filtering tests
      const sampleEvents: EventData[] = [
        {
          id: 'event-1',
          type: 'LOAN_APPLICATION',
          direction: 'OUTBOUND',
          data: {},
          timestamp: '2023-01-01T00:00:00Z'
        },
        {
          id: 'event-2',
          type: 'LOAN_APPLICATION',
          direction: 'INBOUND',
          data: {},
          timestamp: '2023-01-01T01:00:00Z'
        },
        {
          id: 'event-3',
          type: 'COLLATERAL_TOP_UP',
          direction: 'OUTBOUND',
          data: {},
          timestamp: '2023-01-01T02:00:00Z'
        },
        {
          id: 'event-4',
          type: 'COLLATERAL_TOP_UP',
          direction: 'INBOUND',
          data: {},
          timestamp: '2023-01-01T03:00:00Z'
        }
      ];
      
      sampleEvents.forEach(event => eventStore.addEvent(event));
    });

    it('should return all events when no filter provided', () => {
      const events = eventStore.getEvents();
      expect(events).toHaveLength(4);
      expect(events.map(e => e.id)).toEqual(['event-1', 'event-2', 'event-3', 'event-4']);
    });

    it('should return copy of events array (not reference)', () => {
      const events1 = eventStore.getEvents();
      const events2 = eventStore.getEvents();
      
      expect(events1).not.toBe(events2);
      expect(events1).toEqual(events2);
    });

    it('should filter by type', () => {
      const loanEvents = eventStore.getEvents({ type: 'LOAN_APPLICATION' });
      expect(loanEvents).toHaveLength(2);
      expect(loanEvents.map(e => e.id)).toEqual(['event-1', 'event-2']);
      
      const topUpEvents = eventStore.getEvents({ type: 'COLLATERAL_TOP_UP' });
      expect(topUpEvents).toHaveLength(2);
      expect(topUpEvents.map(e => e.id)).toEqual(['event-3', 'event-4']);
    });

    it('should filter by direction', () => {
      const outboundEvents = eventStore.getEvents({ direction: 'OUTBOUND' });
      expect(outboundEvents).toHaveLength(2);
      expect(outboundEvents.map(e => e.id)).toEqual(['event-1', 'event-3']);
      
      const inboundEvents = eventStore.getEvents({ direction: 'INBOUND' });
      expect(inboundEvents).toHaveLength(2);
      expect(inboundEvents.map(e => e.id)).toEqual(['event-2', 'event-4']);
    });

    it('should filter by fromTimestamp', () => {
      const eventsAfter1AM = eventStore.getEvents({ fromTimestamp: '2023-01-01T01:00:00Z' });
      expect(eventsAfter1AM).toHaveLength(3);
      expect(eventsAfter1AM.map(e => e.id)).toEqual(['event-2', 'event-3', 'event-4']);
      
      const eventsAfter2AM = eventStore.getEvents({ fromTimestamp: '2023-01-01T02:00:00Z' });
      expect(eventsAfter2AM).toHaveLength(2);
      expect(eventsAfter2AM.map(e => e.id)).toEqual(['event-3', 'event-4']);
    });

    it('should apply multiple filters', () => {
      const filteredEvents = eventStore.getEvents({
        type: 'LOAN_APPLICATION',
        direction: 'OUTBOUND'
      });
      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0].id).toBe('event-1');
      
      const noMatchEvents = eventStore.getEvents({
        type: 'LOAN_APPLICATION',
        direction: 'OUTBOUND',
        fromTimestamp: '2023-01-01T01:00:00Z'
      });
      expect(noMatchEvents).toHaveLength(0);
    });

    it('should return empty array when no events match filter', () => {
      const events = eventStore.getEvents({ type: 'NONEXISTENT_TYPE' });
      expect(events).toHaveLength(0);
      expect(events).toEqual([]);
    });
  });

  describe('getEventById', () => {
    beforeEach(() => {
      const sampleEvents: EventData[] = [
        {
          id: 'event-1',
          type: 'LOAN_APPLICATION',
          direction: 'OUTBOUND',
          data: { amount: '1000.00' },
          timestamp: '2023-01-01T00:00:00Z'
        },
        {
          id: 'event-2',
          type: 'COLLATERAL_TOP_UP',
          direction: 'INBOUND',
          data: { amount: '500.00' },
          timestamp: '2023-01-01T01:00:00Z'
        }
      ];
      
      sampleEvents.forEach(event => eventStore.addEvent(event));
    });

    it('should return event when ID exists', () => {
      const event = eventStore.getEventById('event-1');
      expect(event).toBeDefined();
      expect(event?.id).toBe('event-1');
      expect(event?.type).toBe('LOAN_APPLICATION');
      expect(event?.data.amount).toBe('1000.00');
    });

    it('should return undefined when ID does not exist', () => {
      const event = eventStore.getEventById('nonexistent-id');
      expect(event).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should remove all events from store', () => {
      // Add some events
      eventStore.addEvent({
        id: 'event-1',
        type: 'LOAN_APPLICATION',
        direction: 'OUTBOUND',
        data: {},
        timestamp: '2023-01-01T00:00:00Z'
      });
      
      eventStore.addEvent({
        id: 'event-2',
        type: 'COLLATERAL_TOP_UP',
        direction: 'INBOUND',
        data: {},
        timestamp: '2023-01-01T01:00:00Z'
      });
      
      expect(eventStore.getEvents()).toHaveLength(2);
      
      // Clear and verify
      eventStore.clear();
      expect(eventStore.getEvents()).toHaveLength(0);
      expect(eventStore.getEventById('event-1')).toBeUndefined();
    });

    it('should allow adding events after clear', () => {
      // Add, clear, then add again
      eventStore.addEvent({
        id: 'event-1',
        type: 'LOAN_APPLICATION',
        direction: 'OUTBOUND',
        data: {},
        timestamp: '2023-01-01T00:00:00Z'
      });
      
      eventStore.clear();
      
      eventStore.addEvent({
        id: 'event-2',
        type: 'COLLATERAL_TOP_UP',
        direction: 'INBOUND',
        data: {},
        timestamp: '2023-01-01T01:00:00Z'
      });
      
      const events = eventStore.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('event-2');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex workflow with filtering and trimming', () => {
      // Reset with small limit
      (EventHistoryStore as any).instance = undefined;
      const store = EventHistoryStore.getInstance({ maxInMemoryEvents: 5 });
      
      // Add events beyond limit
      for (let i = 1; i <= 8; i++) {
        store.addEvent({
          id: `event-${i}`,
          type: i % 2 === 0 ? 'LOAN_APPLICATION' : 'COLLATERAL_TOP_UP',
          direction: i % 3 === 0 ? 'INBOUND' : 'OUTBOUND',
          data: { index: i },
          timestamp: `2023-01-01T0${i}:00:00Z`
        });
      }
      
      // Should only have last 5 events
      const allEvents = store.getEvents();
      expect(allEvents).toHaveLength(5);
      
      // Filter by type
      const loanEvents = store.getEvents({ type: 'LOAN_APPLICATION' });
      expect(loanEvents).toHaveLength(3); // events 4, 6, and 8 (even numbers from 4-8)
      
      // Filter by direction
      const inboundEvents = store.getEvents({ direction: 'INBOUND' });
      expect(inboundEvents).toHaveLength(1); // only event 6 (divisible by 3 from 4-8)
      
      // Test getEventById
      expect(store.getEventById('event-1')).toBeUndefined(); // trimmed
      expect(store.getEventById('event-8')).toBeDefined(); // still exists
    });
  });
});