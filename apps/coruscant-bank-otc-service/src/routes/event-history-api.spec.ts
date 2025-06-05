import express from 'express';
import request from 'supertest';
import { createEventHistoryRouter } from './event-history-api';
import { EventHistoryStore, EventData } from '../utils/event-store';
import logger from '../utils/logger';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

// Mock the EventHistoryStore
jest.mock('../utils/event-store', () => {
  return {
    EventHistoryStore: {
      getInstance: jest.fn()
    }
  };
});

import { EventHistoryStore as MockedEventHistoryStore } from '../utils/event-store';

describe('Event History API Router', () => {
  let app: express.Application;
  let mockEventHistoryStore: jest.Mocked<EventHistoryStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock event store
    mockEventHistoryStore = {
      getEvents: jest.fn(),
      getEventById: jest.fn(),
      addEvent: jest.fn(),
      clear: jest.fn()
    } as unknown as jest.Mocked<EventHistoryStore>;

    (MockedEventHistoryStore.getInstance as jest.Mock).mockReturnValue(mockEventHistoryStore);

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/event-history', createEventHistoryRouter());
  });

  describe('GET /event-history', () => {
    const sampleEvents: EventData[] = [
      {
        id: 'event-1',
        type: 'LOAN_APPLICATION',
        direction: 'OUTBOUND',
        data: { amount: '1000.00' },
        timestamp: '2023-01-01T10:00:00Z'
      },
      {
        id: 'event-2',
        type: 'COLLATERAL_TOP_UP',
        direction: 'INBOUND',
        data: { amount: '500.00' },
        timestamp: '2023-01-01T09:00:00Z'
      },
      {
        id: 'event-3',
        type: 'LOAN_APPLICATION',
        direction: 'OUTBOUND',
        data: { amount: '2000.00' },
        timestamp: '2023-01-01T11:00:00Z'
      }
    ];

    it('should return all events when no filters provided', async () => {
      mockEventHistoryStore.getEvents.mockReturnValue(sampleEvents);

      const response = await request(app)
        .get('/event-history')
        .expect(200);

      expect(response.body).toEqual({
        count: 3,
        totalCount: 3,
        events: [
          {
            id: 'event-2',
            type: 'COLLATERAL_TOP_UP',
            direction: 'INBOUND',
            data: { amount: '500.00' },
            timestamp: '2023-01-01T09:00:00Z'
          },
          {
            id: 'event-1',
            type: 'LOAN_APPLICATION',
            direction: 'OUTBOUND',
            data: { amount: '1000.00' },
            timestamp: '2023-01-01T10:00:00Z'
          },
          {
            id: 'event-3',
            type: 'LOAN_APPLICATION',
            direction: 'OUTBOUND',
            data: { amount: '2000.00' },
            timestamp: '2023-01-01T11:00:00Z'
          }
        ]
      });

      expect(mockEventHistoryStore.getEvents).toHaveBeenCalledWith({
        type: undefined,
        direction: undefined,
        fromTimestamp: undefined
      });
    });

    it('should filter events by type', async () => {
      const filteredEvents = sampleEvents.filter(e => e.type === 'LOAN_APPLICATION');
      mockEventHistoryStore.getEvents.mockReturnValue(filteredEvents);

      const response = await request(app)
        .get('/event-history?type=LOAN_APPLICATION')
        .expect(200);

      expect(response.body.count).toBe(2);
      expect(response.body.totalCount).toBe(2);
      expect(response.body.events).toHaveLength(2);
      expect(response.body.events[0].type).toBe('LOAN_APPLICATION');
      expect(response.body.events[1].type).toBe('LOAN_APPLICATION');

      expect(mockEventHistoryStore.getEvents).toHaveBeenCalledWith({
        type: 'LOAN_APPLICATION',
        direction: undefined,
        fromTimestamp: undefined
      });
    });

    it('should filter events by direction', async () => {
      const filteredEvents = sampleEvents.filter(e => e.direction === 'OUTBOUND');
      mockEventHistoryStore.getEvents.mockReturnValue(filteredEvents);

      const response = await request(app)
        .get('/event-history?direction=OUTBOUND')
        .expect(200);

      expect(response.body.count).toBe(2);
      expect(response.body.events.every((e: EventData) => e.direction === 'OUTBOUND')).toBe(true);

      expect(mockEventHistoryStore.getEvents).toHaveBeenCalledWith({
        type: undefined,
        direction: 'OUTBOUND',
        fromTimestamp: undefined
      });
    });

    it('should filter events by fromTimestamp', async () => {
      const filteredEvents = sampleEvents.filter(e => e.timestamp >= '2023-01-01T10:00:00Z');
      mockEventHistoryStore.getEvents.mockReturnValue(filteredEvents);

      const response = await request(app)
        .get('/event-history?fromTimestamp=2023-01-01T10:00:00Z')
        .expect(200);

      expect(response.body.count).toBe(2);

      expect(mockEventHistoryStore.getEvents).toHaveBeenCalledWith({
        type: undefined,
        direction: undefined,
        fromTimestamp: '2023-01-01T10:00:00Z'
      });
    });

    it('should apply multiple filters', async () => {
      const filteredEvents = sampleEvents.filter(e => 
        e.type === 'LOAN_APPLICATION' && e.direction === 'OUTBOUND'
      );
      mockEventHistoryStore.getEvents.mockReturnValue(filteredEvents);

      const response = await request(app)
        .get('/event-history?type=LOAN_APPLICATION&direction=OUTBOUND')
        .expect(200);

      expect(response.body.count).toBe(2);

      expect(mockEventHistoryStore.getEvents).toHaveBeenCalledWith({
        type: 'LOAN_APPLICATION',
        direction: 'OUTBOUND',
        fromTimestamp: undefined
      });
    });

    it('should apply limit to results', async () => {
      mockEventHistoryStore.getEvents.mockReturnValue(sampleEvents);

      const response = await request(app)
        .get('/event-history?limit=2')
        .expect(200);

      expect(response.body.count).toBe(2);
      expect(response.body.totalCount).toBe(3);
      expect(response.body.events).toHaveLength(2);
      // Should get last 2 events (event-2 and event-3) then sort by timestamp
      expect(response.body.events[0].id).toBe('event-1'); // 10:00 (sorted first)
      expect(response.body.events[1].id).toBe('event-3'); // 11:00 (sorted second)
    });

    it('should ignore invalid limit values', async () => {
      mockEventHistoryStore.getEvents.mockReturnValue(sampleEvents);

      // Test zero limit
      let response = await request(app)
        .get('/event-history?limit=0')
        .expect(200);

      expect(response.body.count).toBe(3);
      expect(response.body.totalCount).toBe(3);

      // Test negative limit
      response = await request(app)
        .get('/event-history?limit=-5')
        .expect(200);

      expect(response.body.count).toBe(3);
      expect(response.body.totalCount).toBe(3);

      // Test non-numeric limit
      response = await request(app)
        .get('/event-history?limit=invalid')
        .expect(200);

      expect(response.body.count).toBe(3);
      expect(response.body.totalCount).toBe(3);
    });

    it('should sort events by timestamp in ascending order', async () => {
      mockEventHistoryStore.getEvents.mockReturnValue(sampleEvents);

      const response = await request(app)
        .get('/event-history')
        .expect(200);

      const events = response.body.events;
      expect(events[0].timestamp).toBe('2023-01-01T09:00:00Z'); // event-2
      expect(events[1].timestamp).toBe('2023-01-01T10:00:00Z'); // event-1
      expect(events[2].timestamp).toBe('2023-01-01T11:00:00Z'); // event-3
    });

    it('should return empty array when no events found', async () => {
      mockEventHistoryStore.getEvents.mockReturnValue([]);

      const response = await request(app)
        .get('/event-history')
        .expect(200);

      expect(response.body).toEqual({
        count: 0,
        totalCount: 0,
        events: []
      });
    });

    it('should handle event store errors and return 500', async () => {
      mockEventHistoryStore.getEvents.mockImplementation(() => {
        throw new Error('Event store error');
      });

      const response = await request(app)
        .get('/event-history')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to retrieve event history'
      });

      expect(logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error) },
        'Error retrieving event history'
      );
    });

    it('should handle complex scenario with limit and sorting', async () => {
      const manyEvents = [
        { id: 'event-1', type: 'TEST', direction: 'OUTBOUND' as const, data: {}, timestamp: '2023-01-01T05:00:00Z' },
        { id: 'event-2', type: 'TEST', direction: 'OUTBOUND' as const, data: {}, timestamp: '2023-01-01T03:00:00Z' },
        { id: 'event-3', type: 'TEST', direction: 'OUTBOUND' as const, data: {}, timestamp: '2023-01-01T07:00:00Z' },
        { id: 'event-4', type: 'TEST', direction: 'OUTBOUND' as const, data: {}, timestamp: '2023-01-01T01:00:00Z' },
        { id: 'event-5', type: 'TEST', direction: 'OUTBOUND' as const, data: {}, timestamp: '2023-01-01T09:00:00Z' }
      ];

      mockEventHistoryStore.getEvents.mockReturnValue(manyEvents);

      const response = await request(app)
        .get('/event-history?limit=3')
        .expect(200);

      expect(response.body.count).toBe(3);
      expect(response.body.totalCount).toBe(5);
      
      // Should get last 3 events (event-3, event-4, event-5) and sort them
      const events = response.body.events;
      expect(events).toHaveLength(3);
      expect(events[0].id).toBe('event-4'); // 01:00 (earliest)
      expect(events[1].id).toBe('event-3'); // 07:00 
      expect(events[2].id).toBe('event-5'); // 09:00 (latest)
    });
  });

  describe('GET /event-history/:id', () => {
    it('should return event when ID exists', async () => {
      const mockEvent: EventData = {
        id: 'event-123',
        type: 'LOAN_APPLICATION',
        direction: 'OUTBOUND',
        data: { amount: '1000.00', borrowerId: 'borrower-456' },
        timestamp: '2023-01-01T10:00:00Z'
      };

      mockEventHistoryStore.getEventById.mockReturnValue(mockEvent);

      const response = await request(app)
        .get('/event-history/event-123')
        .expect(200);

      expect(response.body).toEqual({ event: mockEvent });
      expect(mockEventHistoryStore.getEventById).toHaveBeenCalledWith('event-123');
    });

    it('should return 404 when event ID does not exist', async () => {
      mockEventHistoryStore.getEventById.mockReturnValue(undefined);

      const response = await request(app)
        .get('/event-history/nonexistent-id')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Event not found'
      });

      expect(mockEventHistoryStore.getEventById).toHaveBeenCalledWith('nonexistent-id');
    });

    it('should handle event store errors and return 500', async () => {
      mockEventHistoryStore.getEventById.mockImplementation(() => {
        throw new Error('Database connection error');
      });

      const response = await request(app)
        .get('/event-history/event-123')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to retrieve event'
      });

      expect(logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error), eventId: 'event-123' },
        'Error retrieving event'
      );
    });

    it('should handle special characters in event ID', async () => {
      const specialId = 'event-123-abc_def';
      const mockEvent: EventData = {
        id: specialId,
        type: 'COLLATERAL_TOP_UP',
        direction: 'INBOUND',
        data: {},
        timestamp: '2023-01-01T10:00:00Z'
      };

      mockEventHistoryStore.getEventById.mockReturnValue(mockEvent);

      const response = await request(app)
        .get(`/event-history/${specialId}`)
        .expect(200);

      expect(response.body.event.id).toBe(specialId);
      expect(mockEventHistoryStore.getEventById).toHaveBeenCalledWith(specialId);
    });
  });

  describe('Router initialization', () => {
    it('should create router with EventHistoryStore instance', () => {
      const router = createEventHistoryRouter();
      expect(router).toBeDefined();
      expect(MockedEventHistoryStore.getInstance).toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex filtering with limit and sorting', async () => {
      const complexEvents: EventData[] = [
        { id: 'loan-1', type: 'LOAN_APPLICATION', direction: 'OUTBOUND', data: {}, timestamp: '2023-01-01T15:00:00Z' },
        { id: 'topup-1', type: 'COLLATERAL_TOP_UP', direction: 'INBOUND', data: {}, timestamp: '2023-01-01T14:00:00Z' },
        { id: 'loan-2', type: 'LOAN_APPLICATION', direction: 'OUTBOUND', data: {}, timestamp: '2023-01-01T16:00:00Z' },
        { id: 'topup-2', type: 'COLLATERAL_TOP_UP', direction: 'INBOUND', data: {}, timestamp: '2023-01-01T13:00:00Z' }
      ];

      // Filter should return only LOAN_APPLICATION events
      const filteredEvents = complexEvents.filter(e => e.type === 'LOAN_APPLICATION');
      mockEventHistoryStore.getEvents.mockReturnValue(filteredEvents);

      const response = await request(app)
        .get('/event-history?type=LOAN_APPLICATION&limit=1')
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.totalCount).toBe(2);
      expect(response.body.events[0].id).toBe('loan-2'); // Latest loan application

      expect(mockEventHistoryStore.getEvents).toHaveBeenCalledWith({
        type: 'LOAN_APPLICATION',
        direction: undefined,
        fromTimestamp: undefined
      });
    });

    it('should handle edge case with empty results and filters', async () => {
      mockEventHistoryStore.getEvents.mockReturnValue([]);

      const response = await request(app)
        .get('/event-history?type=NONEXISTENT_TYPE&direction=OUTBOUND&limit=10')
        .expect(200);

      expect(response.body).toEqual({
        count: 0,
        totalCount: 0,
        events: []
      });
    });
  });
});