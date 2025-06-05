import express from 'express';
import request from 'supertest';
import { createSimulationRouter } from './simulation-api';
import { ClientSimulator } from '../simulation/client-simulator';

// Mock the ClientSimulator
jest.mock('../simulation/client-simulator');

const MockedClientSimulator = ClientSimulator as jest.MockedClass<typeof ClientSimulator>;

describe('Simulation API Router', () => {
  let app: express.Application;
  let mockSimulator: jest.Mocked<ClientSimulator>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock simulator
    mockSimulator = {
      isSimulatorRunning: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      getStatistics: jest.fn(),
      cleanup: jest.fn(),
      addClient: jest.fn(),
      removeClient: jest.fn()
    } as unknown as jest.Mocked<ClientSimulator>;

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/simulation', createSimulationRouter(mockSimulator));
  });

  describe('POST /simulation/start', () => {
    it('should start simulator when not already running', async () => {
      mockSimulator.isSimulatorRunning.mockReturnValue(false);
      mockSimulator.start.mockReturnValue(undefined);

      const response = await request(app)
        .post('/simulation/start')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Simulator started successfully'
      });

      expect(mockSimulator.isSimulatorRunning).toHaveBeenCalledTimes(1);
      expect(mockSimulator.start).toHaveBeenCalledTimes(1);
    });

    it('should return 409 when simulator is already running', async () => {
      mockSimulator.isSimulatorRunning.mockReturnValue(true);

      const response = await request(app)
        .post('/simulation/start')
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        message: 'Simulator is already running'
      });

      expect(mockSimulator.isSimulatorRunning).toHaveBeenCalledTimes(1);
      expect(mockSimulator.start).not.toHaveBeenCalled();
    });

    it('should check simulator status before starting', async () => {
      mockSimulator.isSimulatorRunning.mockReturnValue(false);

      await request(app)
        .post('/simulation/start')
        .expect(200);

      expect(mockSimulator.isSimulatorRunning).toHaveBeenCalledTimes(1);
      expect(mockSimulator.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /simulation/stop', () => {
    it('should stop simulator when running', async () => {
      mockSimulator.isSimulatorRunning.mockReturnValue(true);
      mockSimulator.stop.mockReturnValue(undefined);

      const response = await request(app)
        .post('/simulation/stop')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Simulator stopped successfully'
      });

      expect(mockSimulator.isSimulatorRunning).toHaveBeenCalledTimes(1);
      expect(mockSimulator.stop).toHaveBeenCalledTimes(1);
    });

    it('should return 409 when simulator is not running', async () => {
      mockSimulator.isSimulatorRunning.mockReturnValue(false);

      const response = await request(app)
        .post('/simulation/stop')
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        message: 'Simulator is not running'
      });

      expect(mockSimulator.isSimulatorRunning).toHaveBeenCalledTimes(1);
      expect(mockSimulator.stop).not.toHaveBeenCalled();
    });

    it('should check simulator status before stopping', async () => {
      mockSimulator.isSimulatorRunning.mockReturnValue(true);

      await request(app)
        .post('/simulation/stop')
        .expect(200);

      expect(mockSimulator.isSimulatorRunning).toHaveBeenCalledTimes(1);
      expect(mockSimulator.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /simulation/stats', () => {
    it('should return simulator statistics with timestamp', async () => {
      const mockStats = {
        running: true,
        clientCount: 5,
        totalRequests: 150,
        successfulRequests: 120,
        failedRequests: 30,
        averageResponseTime: 250,
        activeClients: ['client-1', 'client-2', 'client-3'],
        uptime: 60000
      };

      mockSimulator.getStatistics.mockReturnValue(mockStats);

      // Mock Date.toISOString to make test deterministic
      const mockTimestamp = '2023-01-01T12:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockTimestamp);

      const response = await request(app)
        .get('/simulation/stats')
        .expect(200);

      expect(response.body).toEqual({
        ...mockStats,
        timestamp: mockTimestamp
      });

      expect(mockSimulator.getStatistics).toHaveBeenCalledTimes(1);

      // Restore the original Date.toISOString
      jest.restoreAllMocks();
    });

    it('should return stats even when simulator is not running', async () => {
      const mockStats = {
        running: false,
        clientCount: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        activeClients: [],
        uptime: 0
      };

      mockSimulator.getStatistics.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/simulation/stats')
        .expect(200);

      expect(response.body).toMatchObject(mockStats);
      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('string');

      expect(mockSimulator.getStatistics).toHaveBeenCalledTimes(1);
    });

    it('should include current timestamp in response', async () => {
      const mockStats = { running: false, clientCount: 0 };
      mockSimulator.getStatistics.mockReturnValue(mockStats);

      const beforeTime = Date.now();
      
      const response = await request(app)
        .get('/simulation/stats')
        .expect(200);

      const afterTime = Date.now();
      const responseTimestamp = new Date(response.body.timestamp).getTime();

      expect(responseTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(responseTimestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should preserve all fields from simulator statistics', async () => {
      const mockStats = {
        running: true,
        clientCount: 3,
        totalRequests: 100,
        successfulRequests: 85,
        failedRequests: 15,
        averageResponseTime: 300,
        activeClients: ['client-a', 'client-b'],
        uptime: 30000,
        customField: 'test-value',
        nestedObject: { nested: 'data' }
      };

      mockSimulator.getStatistics.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/simulation/stats')
        .expect(200);

      // Check that all original fields are preserved
      Object.keys(mockStats).forEach(key => {
        expect(response.body[key]).toEqual(mockStats[key as keyof typeof mockStats]);
      });

      // Check that timestamp was added
      expect(response.body.timestamp).toBeDefined();
      expect(Object.keys(response.body)).toHaveLength(Object.keys(mockStats).length + 1);
    });
  });

  describe('Router integration scenarios', () => {
    it('should handle start-stop-start cycle', async () => {
      // Initially not running
      mockSimulator.isSimulatorRunning.mockReturnValue(false);

      // Start simulator
      await request(app)
        .post('/simulation/start')
        .expect(200);

      expect(mockSimulator.start).toHaveBeenCalledTimes(1);

      // Now simulator is running
      mockSimulator.isSimulatorRunning.mockReturnValue(true);

      // Try to start again (should fail)
      await request(app)
        .post('/simulation/start')
        .expect(409);

      expect(mockSimulator.start).toHaveBeenCalledTimes(1); // No additional call

      // Stop simulator
      await request(app)
        .post('/simulation/stop')
        .expect(200);

      expect(mockSimulator.stop).toHaveBeenCalledTimes(1);

      // Now simulator is stopped
      mockSimulator.isSimulatorRunning.mockReturnValue(false);

      // Start again (should work)
      await request(app)
        .post('/simulation/start')
        .expect(200);

      expect(mockSimulator.start).toHaveBeenCalledTimes(2);
    });

    it('should handle stats requests regardless of simulator state', async () => {
      const runningStats = { running: true, clientCount: 5 };
      const stoppedStats = { running: false, clientCount: 0 };

      // Get stats when running
      mockSimulator.getStatistics.mockReturnValue(runningStats);
      let response = await request(app)
        .get('/simulation/stats')
        .expect(200);

      expect(response.body.running).toBe(true);
      expect(response.body.clientCount).toBe(5);

      // Get stats when stopped
      mockSimulator.getStatistics.mockReturnValue(stoppedStats);
      response = await request(app)
        .get('/simulation/stats')
        .expect(200);

      expect(response.body.running).toBe(false);
      expect(response.body.clientCount).toBe(0);

      expect(mockSimulator.getStatistics).toHaveBeenCalledTimes(2);
    });
  });

  describe('HTTP method validation', () => {
    it('should only accept POST for start endpoint', async () => {
      await request(app).get('/simulation/start').expect(404);
      await request(app).put('/simulation/start').expect(404);
      await request(app).delete('/simulation/start').expect(404);
      await request(app).patch('/simulation/start').expect(404);
    });

    it('should only accept POST for stop endpoint', async () => {
      await request(app).get('/simulation/stop').expect(404);
      await request(app).put('/simulation/stop').expect(404);
      await request(app).delete('/simulation/stop').expect(404);
      await request(app).patch('/simulation/stop').expect(404);
    });

    it('should only accept GET for stats endpoint', async () => {
      await request(app).post('/simulation/stats').expect(404);
      await request(app).put('/simulation/stats').expect(404);
      await request(app).delete('/simulation/stats').expect(404);
      await request(app).patch('/simulation/stats').expect(404);
    });
  });

  describe('Router creation', () => {
    it('should create router with provided simulator instance', () => {
      const router = createSimulationRouter(mockSimulator);
      expect(router).toBeDefined();
      expect(typeof router).toBe('function'); // Express router is a function
    });

    it('should use the provided simulator instance in endpoints', async () => {
      const differentMockSimulator = {
        isSimulatorRunning: jest.fn().mockReturnValue(false),
        start: jest.fn(),
        stop: jest.fn(),
        getStatistics: jest.fn().mockReturnValue({ test: 'value' })
      } as unknown as jest.Mocked<ClientSimulator>;

      // Create new app with different simulator
      const newApp = express();
      newApp.use(express.json());
      newApp.use('/sim', createSimulationRouter(differentMockSimulator));

      await request(newApp)
        .post('/sim/start')
        .expect(200);

      await request(newApp)
        .get('/sim/stats')
        .expect(200);

      // Verify the different simulator was used
      expect(differentMockSimulator.isSimulatorRunning).toHaveBeenCalled();
      expect(differentMockSimulator.start).toHaveBeenCalled();
      expect(differentMockSimulator.getStatistics).toHaveBeenCalled();

      // Verify original simulator was not called
      expect(mockSimulator.isSimulatorRunning).not.toHaveBeenCalled();
      expect(mockSimulator.start).not.toHaveBeenCalled();
      expect(mockSimulator.getStatistics).not.toHaveBeenCalled();
    });
  });
});