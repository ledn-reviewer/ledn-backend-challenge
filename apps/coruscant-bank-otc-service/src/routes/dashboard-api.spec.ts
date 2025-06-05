import express from 'express';
import request from 'supertest';
import { createDashboardRouter } from './dashboard-api';
import { ClientSimulator } from '../simulation/client-simulator';

// Mock the ClientSimulator
jest.mock('../simulation/client-simulator');

describe('Dashboard API Router', () => {
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
      getDetailedStatistics: jest.fn(),
      cleanup: jest.fn(),
      addClient: jest.fn(),
      removeClient: jest.fn()
    } as unknown as jest.Mocked<ClientSimulator>;

    // Setup Express app with router
    app = express();
    app.use(express.json());
    app.use('/dashboard', createDashboardRouter(mockSimulator));
  });

  describe('GET /dashboard', () => {
    it('should serve the dashboard HTML page', async () => {
      const response = await request(app)
        .get('/dashboard')
        .expect(200);

      expect(response.text).toContain('Actor Simulation Dashboard');
      expect(response.text).toContain('Real-time monitoring of client actors');
      expect(response.text).toContain('Simulation Controls');
      expect(response.text).toContain('dashboard');
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('should include all necessary dashboard components', async () => {
      const response = await request(app)
        .get('/dashboard')
        .expect(200);

      // Check for key dashboard elements
      expect(response.text).toContain('startBtn');
      expect(response.text).toContain('stopBtn');
      expect(response.text).toContain('refreshBtn');
      expect(response.text).toContain('activeActors');
      expect(response.text).toContain('totalLoans');
      expect(response.text).toContain('totalTopUps');
      expect(response.text).toContain('deadActors');
      expect(response.text).toContain('actorGrid');
      expect(response.text).toContain('logContainer');
    });

    it('should include WebSocket connection logic', async () => {
      const response = await request(app)
        .get('/dashboard')
        .expect(200);

      expect(response.text).toContain('WebSocket');
      expect(response.text).toContain('/dashboard/ws');
      expect(response.text).toContain('initializeWebSocket');
    });

    it('should include styling elements for the dashboard using Tailwind CSS', async () => {
      const response = await request(app)
        .get('/dashboard')
        .expect(200);

      // Check for Tailwind color and styling classes
      expect(response.text).toContain('bg-gradient-to-br');
      expect(response.text).toContain('from-blue-900');
      expect(response.text).toContain('to-purple-900');
      expect(response.text).toContain('text-white');
      expect(response.text).toContain('bg-opacity-10');
      expect(response.text).toContain('text-yellow-400');
      expect(response.text).toContain('border-white');
    });

    it('should include API endpoints for simulation control', async () => {
      const response = await request(app)
        .get('/dashboard')
        .expect(200);

      expect(response.text).toContain('/simulation/start');
      expect(response.text).toContain('/simulation/stop');
      expect(response.text).toContain('/simulation/dashboard-stats');
    });

    it('should have responsive design elements with Tailwind CSS', async () => {
      const response = await request(app)
        .get('/dashboard')
        .expect(200);

      expect(response.text).toContain('grid-cols-1');
      expect(response.text).toContain('sm:grid-cols-2');
      expect(response.text).toContain('lg:grid-cols-4');
      expect(response.text).toContain('backdrop-blur-lg');
    });

    it('should include real-time update functionality', async () => {
      const response = await request(app)
        .get('/dashboard')
        .expect(200);

      expect(response.text).toContain('updateDashboard');
      expect(response.text).toContain('refreshData');
    });
  });

  describe('Router creation', () => {
    it('should create router with provided simulator instance', () => {
      const router = createDashboardRouter(mockSimulator);
      expect(router).toBeDefined();
      expect(typeof router).toBe('function'); // Express router is a function
    });
  });
});
