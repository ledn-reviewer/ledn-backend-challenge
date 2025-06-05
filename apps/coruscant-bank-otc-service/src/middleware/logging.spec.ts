import { Request, Response, NextFunction } from 'express';
import { requestLogger } from './logging';
import logger from '../utils/logger';

// Mock the logger
jest.mock('../utils/logger', () => ({
  child: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

describe('Logging Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockChildLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock child logger
    mockChildLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    };

    (logger.child as jest.Mock).mockReturnValue(mockChildLogger);

    // Setup mock request
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      headers: {},
      body: {}
    };

    // Setup mock response with event emitter functionality
    const eventListeners: { [key: string]: Function[] } = {};
    mockResponse = {
      statusCode: 200,
      locals: {},
      on: jest.fn((event: string, callback: Function) => {
        if (!eventListeners[event]) {
          eventListeners[event] = [];
        }
        eventListeners[event].push(callback);
        return mockResponse as Response;
      }) as any,
      emit: jest.fn((event: string, ...args: any[]) => {
        if (eventListeners[event]) {
          eventListeners[event].forEach(callback => callback(...args));
        }
        return true;
      }) as any
    };

    mockNext = jest.fn();

    // Mock Date.now for consistent testing
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000) // Start time
      .mockReturnValueOnce(1250); // End time (250ms duration)
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('requestLogger', () => {
    it('should log request received and create child logger', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.child).toHaveBeenCalledWith({
        reqId: undefined,
        method: 'GET',
        url: '/api/test'
      });

      expect(mockChildLogger.info).toHaveBeenCalledWith('Request received');
      expect(mockResponse.locals!.logger).toBe(mockChildLogger);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should use request ID from headers when available', () => {
      mockRequest.headers = { 'x-request-id': 'header-req-123' };

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.child).toHaveBeenCalledWith({
        reqId: 'header-req-123',
        method: 'GET',
        url: '/api/test'
      });
    });

    it('should use request ID from body when header not available', () => {
      mockRequest.body = { requestId: 'body-req-456' };

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.child).toHaveBeenCalledWith({
        reqId: 'body-req-456',
        method: 'GET',
        url: '/api/test'
      });
    });

    it('should prefer header request ID over body request ID', () => {
      mockRequest.headers = { 'x-request-id': 'header-req-123' };
      mockRequest.body = { requestId: 'body-req-456' };

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.child).toHaveBeenCalledWith({
        reqId: 'header-req-123',
        method: 'GET',
        url: '/api/test'
      });
    });

    it('should handle missing request ID gracefully', () => {
      // No request ID in headers or body
      
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.child).toHaveBeenCalledWith({
        reqId: undefined,
        method: 'GET',
        url: '/api/test'
      });
    });

    it('should log request completion with status and duration', () => {
      mockResponse.statusCode = 201;

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger the finish event
      (mockResponse.emit as jest.Mock)('finish');

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        {
          status: 201,
          duration: 250
        },
        'Request completed'
      );
    });

    it('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach(method => {
        jest.clearAllMocks();
        mockRequest.method = method;

        requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.child).toHaveBeenCalledWith(
          expect.objectContaining({
            method: method
          })
        );
      });
    });

    it('should handle different URLs', () => {
      const urls = [
        '/api/loans',
        '/api/loans/123',
        '/health',
        '/api/collateral-top-ups',
        '/simulation/stats'
      ];

      urls.forEach(url => {
        jest.clearAllMocks();
        mockRequest.url = url;

        requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.child).toHaveBeenCalledWith(
          expect.objectContaining({
            url: url
          })
        );
      });
    });

    it('should handle different status codes', () => {
      const statusCodes = [200, 201, 400, 401, 404, 500];

      statusCodes.forEach(statusCode => {
        jest.clearAllMocks();
        mockResponse.statusCode = statusCode;

        requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
        (mockResponse.emit as jest.Mock)('finish');

        expect(mockChildLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            status: statusCode
          }),
          'Request completed'
        );
      });
    });

    it('should calculate duration correctly', () => {
      // Reset Date.now mock for this test
      jest.restoreAllMocks();
      const mockNow = jest.spyOn(Date, 'now');
      
      const startTime = 1000;
      const endTime = 1750; // 750ms duration
      
      mockNow
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      (mockResponse.emit as jest.Mock)('finish');

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 750
        }),
        'Request completed'
      );
    });

    it('should handle zero duration requests', () => {
      jest.restoreAllMocks();
      const mockNow = jest.spyOn(Date, 'now');
      
      const time = 1000;
      mockNow.mockReturnValue(time); // Same time for start and end

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      (mockResponse.emit as jest.Mock)('finish');

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 0
        }),
        'Request completed'
      );
    });

    it('should handle complex request ID values', () => {
      const complexRequestIds = [
        'uuid-123e4567-e89b-12d3-a456-426614174000',
        'req_with_underscores_123',
        'REQ-WITH-DASHES-456',
        '123456789',
        'special-chars-!@#$%'
      ];

      complexRequestIds.forEach(reqId => {
        jest.clearAllMocks();
        mockRequest.headers = { 'x-request-id': reqId };

        requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.child).toHaveBeenCalledWith(
          expect.objectContaining({
            reqId: reqId
          })
        );
      });
    });

    it('should handle missing headers object', () => {
      delete mockRequest.headers;

      expect(() => {
        requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow();
    });

    it('should handle missing body object', () => {
      delete mockRequest.body;

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.child).toHaveBeenCalledWith({
        reqId: undefined,
        method: 'GET',
        url: '/api/test'
      });
    });

    it('should handle multiple finish events', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger finish event multiple times
      (mockResponse.emit as jest.Mock)('finish');
      (mockResponse.emit as jest.Mock)('finish');
      (mockResponse.emit as jest.Mock)('finish');

      // Should log completion each time
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ status: 200 }),
        'Request completed'
      );
      expect(mockChildLogger.info).toHaveBeenCalledTimes(4); // 1 initial + 3 finish events
    });

    it('should preserve existing res.locals properties', () => {
      mockResponse.locals = { existingProperty: 'value' };

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.locals.existingProperty).toBe('value');
      expect(mockResponse.locals.logger).toBe(mockChildLogger);
    });

    it('should handle POST request with body containing request ID', () => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/loans';
      mockRequest.body = {
        requestId: 'post-req-789',
        amount: '1000.00',
        borrowerId: 'borrower-123'
      };

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.child).toHaveBeenCalledWith({
        reqId: 'post-req-789',
        method: 'POST',
        url: '/api/loans'
      });
    });

    it('should work with different Express route patterns', () => {
      const routePatterns = [
        { url: '/api/loans/:id', method: 'GET' },
        { url: '/api/loans', method: 'POST' },
        { url: '/simulation/start', method: 'POST' },
        { url: '/event-history', method: 'GET' },
        { url: '/health', method: 'GET' }
      ];

      routePatterns.forEach(({ url, method }) => {
        jest.clearAllMocks();
        mockRequest.url = url;
        mockRequest.method = method;

        requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.child).toHaveBeenCalledWith(
          expect.objectContaining({
            method: method,
            url: url
          })
        );
        expect(mockNext).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle edge case with empty string request ID', () => {
      mockRequest.headers = { 'x-request-id': '' };
      // Empty string is falsy in || operation, so it will fall back to body requestId

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.child).toHaveBeenCalledWith({
        reqId: undefined, // Empty string is falsy, falls back to undefined
        method: 'GET',
        url: '/api/test'
      });
    });

    it('should setup response finish listener correctly', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });
});