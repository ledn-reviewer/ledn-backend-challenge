import { initializeSimulator, autoStartSimulatorIfEnabled } from './index';
import { ClientSimulator } from './client-simulator';
import logger from '../utils/logger';

// Mock dependencies
jest.mock('./client-simulator');
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const MockedClientSimulator = ClientSimulator as jest.MockedClass<typeof ClientSimulator>;

describe('Simulation Index', () => {
  let mockSimulator: jest.Mocked<ClientSimulator>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    delete process.env.SIMULATOR_MAX_CLIENTS;
    delete process.env.SIMULATOR_ACTION_INTERVAL_MS;
    delete process.env.PRICE_SERVICE_API_ENDPOINT;
    delete process.env.SIMULATOR_AUTO_START;

    // Setup mock simulator
    mockSimulator = {
      start: jest.fn(),
      stop: jest.fn(),
      isSimulatorRunning: jest.fn(),
      getStatistics: jest.fn(),
      cleanup: jest.fn(),
      addClient: jest.fn(),
      removeClient: jest.fn()
    } as unknown as jest.Mocked<ClientSimulator>;

    MockedClientSimulator.mockImplementation(() => mockSimulator);
  });

  describe('initializeSimulator', () => {
    it('should create simulator with default configuration', () => {
      const baseUrl = 'https://api.example.com';
      
      const result = initializeSimulator(baseUrl);

      expect(MockedClientSimulator).toHaveBeenCalledWith({
        maxClients: 10,
        actionIntervalMs: 1000,
        apiBaseUrl: baseUrl,
        priceServiceApiEndpoint: undefined
      });
      expect(result).toBe(mockSimulator);
    });

    it('should use environment variables when provided', () => {
      process.env.SIMULATOR_MAX_CLIENTS = '25';
      process.env.SIMULATOR_ACTION_INTERVAL_MS = '2000';
      process.env.PRICE_SERVICE_API_ENDPOINT = 'https://prices.example.com';

      const baseUrl = 'https://api.example.com';
      
      const result = initializeSimulator(baseUrl);

      expect(MockedClientSimulator).toHaveBeenCalledWith({
        maxClients: 25,
        actionIntervalMs: 2000,
        apiBaseUrl: baseUrl,
        priceServiceApiEndpoint: 'https://prices.example.com'
      });
      expect(result).toBe(mockSimulator);
    });

    it('should handle invalid maxClients environment variable', () => {
      process.env.SIMULATOR_MAX_CLIENTS = 'invalid-number';
      
      const baseUrl = 'https://api.example.com';
      
      const result = initializeSimulator(baseUrl);

      expect(MockedClientSimulator).toHaveBeenCalledWith({
        maxClients: NaN,
        actionIntervalMs: 1000,
        apiBaseUrl: baseUrl,
        priceServiceApiEndpoint: undefined
      });
      expect(result).toBe(mockSimulator);
    });

    it('should handle invalid actionIntervalMs environment variable', () => {
      process.env.SIMULATOR_ACTION_INTERVAL_MS = 'not-a-number';
      
      const baseUrl = 'https://api.example.com';
      
      const result = initializeSimulator(baseUrl);

      expect(MockedClientSimulator).toHaveBeenCalledWith({
        maxClients: 10,
        actionIntervalMs: NaN,
        apiBaseUrl: baseUrl,
        priceServiceApiEndpoint: undefined
      });
      expect(result).toBe(mockSimulator);
    });

    it('should handle zero values in environment variables', () => {
      process.env.SIMULATOR_MAX_CLIENTS = '0';
      process.env.SIMULATOR_ACTION_INTERVAL_MS = '0';
      
      const baseUrl = 'https://api.example.com';
      
      const result = initializeSimulator(baseUrl);

      expect(MockedClientSimulator).toHaveBeenCalledWith({
        maxClients: 0,
        actionIntervalMs: 0,
        apiBaseUrl: baseUrl,
        priceServiceApiEndpoint: undefined
      });
      expect(result).toBe(mockSimulator);
    });

    it('should handle negative values in environment variables', () => {
      process.env.SIMULATOR_MAX_CLIENTS = '-5';
      process.env.SIMULATOR_ACTION_INTERVAL_MS = '-1000';
      
      const baseUrl = 'https://api.example.com';
      
      const result = initializeSimulator(baseUrl);

      expect(MockedClientSimulator).toHaveBeenCalledWith({
        maxClients: -5,
        actionIntervalMs: -1000,
        apiBaseUrl: baseUrl,
        priceServiceApiEndpoint: undefined
      });
      expect(result).toBe(mockSimulator);
    });

    it('should handle empty string environment variables', () => {
      process.env.SIMULATOR_MAX_CLIENTS = '';
      process.env.SIMULATOR_ACTION_INTERVAL_MS = '';
      process.env.PRICE_SERVICE_API_ENDPOINT = '';
      
      const baseUrl = 'https://api.example.com';
      
      const result = initializeSimulator(baseUrl);

      // Empty strings will parse to NaN for numbers, empty string for endpoint
      expect(MockedClientSimulator).toHaveBeenCalledWith({
        maxClients: 10, // Uses default when empty string
        actionIntervalMs: 1000, // Uses default when empty string
        apiBaseUrl: baseUrl,
        priceServiceApiEndpoint: ''
      });
      expect(result).toBe(mockSimulator);
    });

    it('should pass through different baseUrl values', () => {
      const testUrls = [
        'http://localhost:3000',
        'https://staging.example.com',
        'https://prod.api.company.com/v1',
        'http://192.168.1.100:8080'
      ];

      testUrls.forEach(url => {
        jest.clearAllMocks();
        
        const result = initializeSimulator(url);
        
        expect(MockedClientSimulator).toHaveBeenCalledWith(
          expect.objectContaining({
            apiBaseUrl: url
          })
        );
        expect(result).toBe(mockSimulator);
      });
    });

    it('should preserve all environment variables together', () => {
      process.env.SIMULATOR_MAX_CLIENTS = '15';
      process.env.SIMULATOR_ACTION_INTERVAL_MS = '500';
      process.env.PRICE_SERVICE_API_ENDPOINT = 'https://prices.api.com/v2';
      
      const baseUrl = 'https://main.api.com';
      
      const result = initializeSimulator(baseUrl);

      expect(MockedClientSimulator).toHaveBeenCalledWith({
        maxClients: 15,
        actionIntervalMs: 500,
        apiBaseUrl: baseUrl,
        priceServiceApiEndpoint: 'https://prices.api.com/v2'
      });
      expect(result).toBe(mockSimulator);
    });

    it('should handle decimal numbers in environment variables', () => {
      process.env.SIMULATOR_MAX_CLIENTS = '12.5';
      process.env.SIMULATOR_ACTION_INTERVAL_MS = '1500.75';
      
      const baseUrl = 'https://api.example.com';
      
      const result = initializeSimulator(baseUrl);

      expect(MockedClientSimulator).toHaveBeenCalledWith({
        maxClients: 12, // parseInt truncates decimals
        actionIntervalMs: 1500, // parseInt truncates decimals
        apiBaseUrl: baseUrl,
        priceServiceApiEndpoint: undefined
      });
      expect(result).toBe(mockSimulator);
    });
  });

  describe('autoStartSimulatorIfEnabled', () => {
    it('should start simulator when auto-start is enabled', () => {
      process.env.SIMULATOR_AUTO_START = 'true';
      
      autoStartSimulatorIfEnabled(mockSimulator);

      expect(logger.info).toHaveBeenCalledWith('Auto-starting client simulator...');
      expect(mockSimulator.start).toHaveBeenCalledTimes(1);
    });

    it('should not start simulator when auto-start is disabled', () => {
      process.env.SIMULATOR_AUTO_START = 'false';
      
      autoStartSimulatorIfEnabled(mockSimulator);

      expect(logger.info).toHaveBeenCalledWith('Client simulator is ready (auto-start disabled)');
      expect(mockSimulator.start).not.toHaveBeenCalled();
    });

    it('should not start simulator when auto-start is not set', () => {
      // SIMULATOR_AUTO_START is undefined
      
      autoStartSimulatorIfEnabled(mockSimulator);

      expect(logger.info).toHaveBeenCalledWith('Client simulator is ready (auto-start disabled)');
      expect(mockSimulator.start).not.toHaveBeenCalled();
    });

    it('should not start simulator when auto-start is empty string', () => {
      process.env.SIMULATOR_AUTO_START = '';
      
      autoStartSimulatorIfEnabled(mockSimulator);

      expect(logger.info).toHaveBeenCalledWith('Client simulator is ready (auto-start disabled)');
      expect(mockSimulator.start).not.toHaveBeenCalled();
    });

    it('should not start simulator for case-sensitive "True"', () => {
      process.env.SIMULATOR_AUTO_START = 'True';
      
      autoStartSimulatorIfEnabled(mockSimulator);

      expect(logger.info).toHaveBeenCalledWith('Client simulator is ready (auto-start disabled)');
      expect(mockSimulator.start).not.toHaveBeenCalled();
    });

    it('should not start simulator for "1" value', () => {
      process.env.SIMULATOR_AUTO_START = '1';
      
      autoStartSimulatorIfEnabled(mockSimulator);

      expect(logger.info).toHaveBeenCalledWith('Client simulator is ready (auto-start disabled)');
      expect(mockSimulator.start).not.toHaveBeenCalled();
    });

    it('should handle multiple calls with same simulator', () => {
      process.env.SIMULATOR_AUTO_START = 'true';
      
      autoStartSimulatorIfEnabled(mockSimulator);
      autoStartSimulatorIfEnabled(mockSimulator);

      expect(logger.info).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith('Auto-starting client simulator...');
      expect(mockSimulator.start).toHaveBeenCalledTimes(2);
    });

    it('should work with different simulator instances', () => {
      const anotherMockSimulator = {
        start: jest.fn(),
        stop: jest.fn(),
        isSimulatorRunning: jest.fn(),
        getStatistics: jest.fn(),
        cleanup: jest.fn(),
        addClient: jest.fn(),
        removeClient: jest.fn()
      } as unknown as jest.Mocked<ClientSimulator>;

      process.env.SIMULATOR_AUTO_START = 'true';
      
      autoStartSimulatorIfEnabled(mockSimulator);
      autoStartSimulatorIfEnabled(anotherMockSimulator);

      expect(mockSimulator.start).toHaveBeenCalledTimes(1);
      expect(anotherMockSimulator.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration scenarios', () => {
    it('should initialize and auto-start when enabled', () => {
      process.env.SIMULATOR_MAX_CLIENTS = '5';
      process.env.SIMULATOR_ACTION_INTERVAL_MS = '2000';
      process.env.PRICE_SERVICE_API_ENDPOINT = 'https://prices.example.com';
      process.env.SIMULATOR_AUTO_START = 'true';

      const baseUrl = 'https://api.example.com';
      
      const simulator = initializeSimulator(baseUrl);
      autoStartSimulatorIfEnabled(simulator);

      expect(MockedClientSimulator).toHaveBeenCalledWith({
        maxClients: 5,
        actionIntervalMs: 2000,
        apiBaseUrl: baseUrl,
        priceServiceApiEndpoint: 'https://prices.example.com'
      });
      
      expect(logger.info).toHaveBeenCalledWith('Auto-starting client simulator...');
      expect(mockSimulator.start).toHaveBeenCalledTimes(1);
    });

    it('should initialize but not auto-start when disabled', () => {
      process.env.SIMULATOR_MAX_CLIENTS = '3';
      process.env.SIMULATOR_AUTO_START = 'false';

      const baseUrl = 'https://api.example.com';
      
      const simulator = initializeSimulator(baseUrl);
      autoStartSimulatorIfEnabled(simulator);

      expect(MockedClientSimulator).toHaveBeenCalledWith(
        expect.objectContaining({
          maxClients: 3,
          apiBaseUrl: baseUrl
        })
      );
      
      expect(logger.info).toHaveBeenCalledWith('Client simulator is ready (auto-start disabled)');
      expect(mockSimulator.start).not.toHaveBeenCalled();
    });

    it('should handle complete configuration workflow', () => {
      // Setup environment
      process.env.SIMULATOR_MAX_CLIENTS = '20';
      process.env.SIMULATOR_ACTION_INTERVAL_MS = '750';
      process.env.PRICE_SERVICE_API_ENDPOINT = 'https://prices-prod.example.com/api/v1';
      process.env.SIMULATOR_AUTO_START = 'true';

      // Initialize simulator
      const baseUrl = 'https://prod-api.example.com';
      const simulator = initializeSimulator(baseUrl);
      
      // Verify initialization
      expect(simulator).toBe(mockSimulator);
      expect(MockedClientSimulator).toHaveBeenCalledWith({
        maxClients: 20,
        actionIntervalMs: 750,
        apiBaseUrl: baseUrl,
        priceServiceApiEndpoint: 'https://prices-prod.example.com/api/v1'
      });

      // Auto-start if enabled
      autoStartSimulatorIfEnabled(simulator);
      
      // Verify auto-start
      expect(logger.info).toHaveBeenCalledWith('Auto-starting client simulator...');
      expect(mockSimulator.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('Default constants', () => {
    it('should use correct default values when environment variables are undefined', () => {
      // Ensure no environment variables are set
      delete process.env.SIMULATOR_MAX_CLIENTS;
      delete process.env.SIMULATOR_ACTION_INTERVAL_MS;
      delete process.env.PRICE_SERVICE_API_ENDPOINT;
      
      const baseUrl = 'https://api.example.com';
      
      initializeSimulator(baseUrl);

      expect(MockedClientSimulator).toHaveBeenCalledWith({
        maxClients: 10, // DEFAULT_MAX_CLIENTS
        actionIntervalMs: 1000, // DEFAULT_ACTION_INTERVAL_MS
        apiBaseUrl: baseUrl,
        priceServiceApiEndpoint: undefined
      });
    });
  });
});