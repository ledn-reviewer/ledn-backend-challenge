import express from 'express';
import request from 'supertest';
import { createApiRouter } from './api';
import { isSelfPublishingEnabled } from '../config/aws';
import { LoanEventStore } from '../handlers/loanEventHandler';
import { EventHistoryStore } from '../utils/event-store';
import axios from 'axios';

// Mock external dependencies
jest.mock('axios');
jest.mock('../services/sns/publisher');
jest.mock('../handlers/loanEventHandler');
jest.mock('../utils/event-store');
jest.mock('../config/aws');

// Mock EventPublisher class
const mockPublishEvent = jest.fn().mockResolvedValue('event-id-123');
jest.mock('../services/sns/event-publisher', () => {
  return {
    EventPublisher: jest.fn().mockImplementation(() => {
      return {
        publishEvent: mockPublishEvent
      };
    })
  };
});

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedIsSelfPublishingEnabled = isSelfPublishingEnabled as jest.MockedFunction<typeof isSelfPublishingEnabled>;

describe('API Router', () => {
  let app: express.Application;
  let processedRequests: Set<string>;
  let mockEventStore: jest.Mocked<LoanEventStore>;
  let mockEventHistoryStore: jest.Mocked<EventHistoryStore>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set liquidation service URL for tests
    process.env.LIQUIDATION_SERVICE_URL = 'http://localhost:4000';

    // Setup mocks
    processedRequests = new Set<string>();

    mockEventStore = {
      getEvents: jest.fn().mockReturnValue([])
    } as unknown as jest.Mocked<LoanEventStore>;

    mockEventHistoryStore = {
      getEvents: jest.fn().mockReturnValue([]),
      getEventById: jest.fn()
    } as unknown as jest.Mocked<EventHistoryStore>;

    (LoanEventStore.getInstance as jest.Mock).mockReturnValue(mockEventStore);
    (EventHistoryStore.getInstance as jest.Mock).mockReturnValue(mockEventHistoryStore);

    // Reset mock for publishEvent
    mockPublishEvent.mockClear();
    mockPublishEvent.mockResolvedValue('event-id-123');

    mockedIsSelfPublishingEnabled.mockReturnValue(false);

    mockedAxios.post.mockResolvedValue({ data: { message: 'success' } });

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/api', createApiRouter(processedRequests));
  });

  describe('POST /api/loan-applications', () => {
    const validLoanApplication = {
      requestId: 'test-request-123',
      loanId: 'loan-456',
      amount: '1000.00',
      borrowerId: 'borrower-789',
      collateralAmount: '1200.00',
      assetType: 'BSK'
    };

    it('should accept valid loan application and return 202', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .send(validLoanApplication)
        .expect(202);

      expect(response.body).toEqual({
        message: 'Loan application submitted',
        requestId: validLoanApplication.requestId,
        timestamp: expect.any(String),
        publishedToSNS: false
      });

      expect(mockPublishEvent).toHaveBeenCalledWith({
        eventType: 'LOAN_APPLICATION',
        requestId: validLoanApplication.requestId,
        data: validLoanApplication,
        timestamp: expect.any(String)
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:4000/loan-applications',
        validLoanApplication
      );
    });

    it('should use custom liquidation service URL from environment', async () => {
      const originalUrl = process.env.LIQUIDATION_SERVICE_URL;
      process.env.LIQUIDATION_SERVICE_URL = 'http://custom-service:8080';

      // Recreate app with new environment
      app = express();
      app.use(express.json());
      app.use('/api', createApiRouter(processedRequests));

      await request(app)
        .post('/api/loan-applications')
        .send(validLoanApplication)
        .expect(202);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://custom-service:8080/loan-applications',
        validLoanApplication
      );

      // Restore original value
      if (originalUrl) {
        process.env.LIQUIDATION_SERVICE_URL = originalUrl;
      } else {
        delete process.env.LIQUIDATION_SERVICE_URL;
      }
    });

    it('should return 400 for invalid loan application', async () => {
      const invalidApplication = {
        requestId: 'test-request-123'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/loan-applications')
        .send(invalidApplication)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Validation Error',
        details: expect.any(Array)
      });
    });

    it('should return 409 for duplicate request ID', async () => {
      // First request should succeed
      await request(app)
        .post('/api/loan-applications')
        .send(validLoanApplication)
        .expect(202);

      // Second request with same ID should fail
      const response = await request(app)
        .post('/api/loan-applications')
        .send(validLoanApplication)
        .expect(409);

      expect(response.body).toEqual({
        message: 'Request already processed',
        requestId: validLoanApplication.requestId
      });
    });

    it('should return 500 when SNS publishing fails', async () => {
      mockPublishEvent.mockRejectedValue(new Error('SNS Error'));

      const response = await request(app)
        .post('/api/loan-applications')
        .send(validLoanApplication)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Processing failure',
        requestId: validLoanApplication.requestId
      });
    });

    it('should return 500 when liquidation service call fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Service Unavailable'));

      const response = await request(app)
        .post('/api/loan-applications')
        .send(validLoanApplication)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Processing failure',
        requestId: validLoanApplication.requestId
      });
    });

    it('should indicate SNS publishing when enabled', async () => {
      mockedIsSelfPublishingEnabled.mockReturnValue(true);

      // Recreate app to pick up new publishing setting
      app = express();
      app.use(express.json());
      app.use('/api', createApiRouter(processedRequests));

      const response = await request(app)
        .post('/api/loan-applications')
        .send(validLoanApplication)
        .expect(202);

      expect(response.body.publishedToSNS).toBe(true);
    });
  });

  describe('POST /api/collateral-top-ups', () => {
    const validTopUp = {
      requestId: 'test-topup-123',
      loanId: 'loan-456',
      borrowerId: 'borrower-789',
      amount: '500.00',
      assetType: 'BSK'
    };

    it('should accept valid collateral top-up and return 202', async () => {
      const response = await request(app)
        .post('/api/collateral-top-ups')
        .send(validTopUp)
        .expect(202);

      expect(response.body).toEqual({
        message: 'Collateral top-up submitted',
        requestId: validTopUp.requestId,
        timestamp: expect.any(String),
        publishedToSNS: false
      });

      expect(mockPublishEvent).toHaveBeenCalledWith({
        eventType: 'COLLATERAL_TOP_UP',
        requestId: validTopUp.requestId,
        data: validTopUp,
        timestamp: expect.any(String)
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:4000/collateral-top-ups',
        validTopUp
      );
    });

    it('should return 400 for invalid collateral top-up', async () => {
      const invalidTopUp = {
        requestId: 'test-topup-123'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/collateral-top-ups')
        .send(invalidTopUp)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Validation Error',
        details: expect.any(Array)
      });
    });

    it('should return 500 when processing fails', async () => {
      mockPublishEvent.mockRejectedValue(new Error('Processing Error'));

      const response = await request(app)
        .post('/api/collateral-top-ups')
        .send(validTopUp)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Processing failure',
        requestId: validTopUp.requestId
      });
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      mockEventStore.getEvents.mockReturnValue([
        { id: '1', type: 'LOAN_APPLICATION' },
        { id: '2', type: 'COLLATERAL_TOP_UP' }
      ] as unknown as never[]);

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        eventCount: 2,
        selfPublishingEnabled: false
      });
    });

    it('should show SNS publishing enabled when configured', async () => {
      mockedIsSelfPublishingEnabled.mockReturnValue(true);

      // Recreate app to pick up new setting
      app = express();
      app.use(express.json());
      app.use('/api', createApiRouter(processedRequests));

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.selfPublishingEnabled).toBe(true);
    });
  });

  describe('GET /api/healthz', () => {
    it('should return kubernetes health check', async () => {
      const response = await request(app)
        .get('/api/healthz')
        .expect(200);

      expect(response.text).toBe('ok');
    });
  });

  describe('GET /api/events', () => {
    it('should return stored events', async () => {
      const mockEvents = [
        { id: '1', type: 'LOAN_APPLICATION', data: {} },
        { id: '2', type: 'COLLATERAL_TOP_UP', data: {} }
      ];

      mockEventStore.getEvents.mockReturnValue(mockEvents as never[]);

      const response = await request(app)
        .get('/api/events')
        .expect(200);

      expect(response.body).toEqual({
        events: mockEvents
      });
    });
  });

  describe('GET /api/event-history', () => {
    it('should return filtered event history', async () => {
      const mockEvents = [
        { id: '1', type: 'LOAN_APPLICATION', direction: 'OUTBOUND' as const, data: {}, timestamp: '2023-01-01T00:00:00Z' },
        { id: '2', type: 'COLLATERAL_TOP_UP', direction: 'INBOUND' as const, data: {}, timestamp: '2023-01-01T00:00:00Z' }
      ];

      mockEventHistoryStore.getEvents.mockReturnValue(mockEvents);

      const response = await request(app)
        .get('/api/event-history')
        .expect(200);

      expect(response.body).toEqual({
        count: 2,
        events: mockEvents
      });

      expect(mockEventHistoryStore.getEvents).toHaveBeenCalledWith({
        type: undefined,
        direction: undefined,
        fromTimestamp: undefined
      });
    });

    it('should filter by type and direction', async () => {
      const response = await request(app)
        .get('/api/event-history?type=LOAN_APPLICATION&direction=OUTBOUND&fromTimestamp=2023-01-01T00:00:00Z')
        .expect(200);

      expect(mockEventHistoryStore.getEvents).toHaveBeenCalledWith({
        type: 'LOAN_APPLICATION',
        direction: 'OUTBOUND',
        fromTimestamp: '2023-01-01T00:00:00Z'
      });
    });
  });

  describe('GET /api/event-history/:id', () => {
    it('should return specific event by ID', async () => {
      const mockEvent = { id: 'event-123', type: 'LOAN_APPLICATION', direction: 'OUTBOUND' as const, data: {}, timestamp: '2023-01-01T00:00:00Z' };
      mockEventHistoryStore.getEventById.mockReturnValue(mockEvent);

      const response = await request(app)
        .get('/api/event-history/event-123')
        .expect(200);

      expect(response.body).toEqual({ event: mockEvent });
      expect(mockEventHistoryStore.getEventById).toHaveBeenCalledWith('event-123');
    });

    it('should return 404 when event not found', async () => {
      mockEventHistoryStore.getEventById.mockReturnValue(undefined);

      const response = await request(app)
        .get('/api/event-history/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Event not found'
      });
    });
  });
});
