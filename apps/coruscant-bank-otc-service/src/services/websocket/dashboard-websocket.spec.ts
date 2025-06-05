import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { DashboardWebSocketService } from './dashboard-websocket';
import { ClientSimulator } from '../../simulation/client-simulator';

// Mock dependencies
jest.mock('ws');
jest.mock('../../simulation/client-simulator');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const MockedWebSocketServer = WebSocketServer as jest.MockedClass<typeof WebSocketServer>;
const MockedClientSimulator = ClientSimulator as jest.MockedClass<typeof ClientSimulator>;

describe('DashboardWebSocketService', () => {
  let mockServer: jest.Mocked<Server>;
  let mockSimulator: jest.Mocked<ClientSimulator>;
  let mockWSS: jest.Mocked<WebSocketServer>;
  let service: DashboardWebSocketService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(global, 'setInterval');
    jest.spyOn(global, 'clearInterval');

    // Setup mock server
    mockServer = {
      listen: jest.fn(),
      close: jest.fn()
    } as unknown as jest.Mocked<Server>;

    // Setup mock simulator
    mockSimulator = {
      getStatistics: jest.fn().mockReturnValue({
        loanApplications: 5,
        collateralTopUps: 3,
        deadActors: 2,
        activeClients: 4,
        isRunning: true
      }),
      getDetailedStatistics: jest.fn().mockReturnValue({
        actors: [
          {
            id: 'actor-1',
            type: 'whale',
            riskTolerance: 0.7,
            actionsPerformed: 3,
            activeLoans: 2,
            maxLoanAmount: 1000,
            isActive: true
          }
        ],
        lastAction: 'LOAN_APPLICATION',
        performance: {
          averageActionsPerActor: 2.5,
          totalActiveLoans: 2
        }
      })
    } as unknown as jest.Mocked<ClientSimulator>;

    // Setup mock WebSocketServer
    mockWSS = {
      on: jest.fn(),
      close: jest.fn()
    } as unknown as jest.Mocked<WebSocketServer>;

    MockedWebSocketServer.mockImplementation(() => mockWSS);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize WebSocket server with correct configuration', () => {
      service = new DashboardWebSocketService(mockServer, mockSimulator);

      expect(MockedWebSocketServer).toHaveBeenCalledWith({
        server: mockServer,
        path: '/dashboard/ws'
      });
    });

    it('should setup event listeners on WebSocket server', () => {
      service = new DashboardWebSocketService(mockServer, mockSimulator);

      expect(mockWSS.on).toHaveBeenCalledWith('connection', expect.any(Function));
      expect(mockWSS.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should start broadcasting timer', () => {
      service = new DashboardWebSocketService(mockServer, mockSimulator);

      // Fast forward time to trigger interval
      jest.advanceTimersByTime(2000);

      // Broadcasting should be set up (interval should be created)
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 2000);
    });
  });

  describe('broadcastEvent', () => {
    let mockWebSocket: jest.Mocked<WebSocket>;

    beforeEach(() => {
      mockWebSocket = {
        readyState: WebSocket.OPEN,
        send: jest.fn(),
        close: jest.fn()
      } as unknown as jest.Mocked<WebSocket>;

      service = new DashboardWebSocketService(mockServer, mockSimulator);
      
      // Manually add a client to the service
      (service as any).clients.add(mockWebSocket);
    });

    it('should broadcast events to connected clients', () => {
      const eventType = 'actor_died';
      const eventData = { actorId: 'actor-123' };

      service.broadcastEvent(eventType, eventData);

      const sentMessage = mockWebSocket.send.mock.calls[0][0] as string;
      const parsedMessage = JSON.parse(sentMessage);
      
      expect(parsedMessage).toMatchObject({
        type: 'event',
        eventType,
        data: eventData
      });
      expect(parsedMessage.timestamp).toBeDefined();
    });

    it('should not broadcast when no clients are connected', () => {
      // Clear clients
      (service as any).clients.clear();

      const eventType = 'actor_died';
      const eventData = { actorId: 'actor-123' };

      service.broadcastEvent(eventType, eventData);

      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should handle send errors gracefully', () => {
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      const eventType = 'actor_died';
      const eventData = { actorId: 'actor-123' };

      // Should not throw
      expect(() => service.broadcastEvent(eventType, eventData)).not.toThrow();
    });
  });

  describe('getConnectedClientsCount', () => {
    it('should return correct number of connected clients', () => {
      service = new DashboardWebSocketService(mockServer, mockSimulator);

      expect(service.getConnectedClientsCount()).toBe(0);

      // Manually add clients
      const mockClient1 = {} as WebSocket;
      const mockClient2 = {} as WebSocket;
      
      (service as any).clients.add(mockClient1);
      (service as any).clients.add(mockClient2);

      expect(service.getConnectedClientsCount()).toBe(2);
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      service = new DashboardWebSocketService(mockServer, mockSimulator);
    });

    it('should clear broadcast interval', () => {
      service.stop();

      expect(clearInterval).toHaveBeenCalled();
    });

    it('should close all client connections', () => {
      const mockClient1 = {
        readyState: WebSocket.OPEN,
        close: jest.fn()
      } as unknown as jest.Mocked<WebSocket>;
      
      const mockClient2 = {
        readyState: WebSocket.OPEN,
        close: jest.fn()
      } as unknown as jest.Mocked<WebSocket>;

      (service as any).clients.add(mockClient1);
      (service as any).clients.add(mockClient2);

      service.stop();

      expect(mockClient1.close).toHaveBeenCalledWith(1000, 'Service shutting down');
      expect(mockClient2.close).toHaveBeenCalledWith(1000, 'Service shutting down');
    });

    it('should close WebSocket server', () => {
      service.stop();

      expect(mockWSS.close).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should clear clients set', () => {
      const mockClient = {} as WebSocket;
      (service as any).clients.add(mockClient);

      expect(service.getConnectedClientsCount()).toBe(1);

      service.stop();

      expect(service.getConnectedClientsCount()).toBe(0);
    });
  });

  describe('data generation', () => {
    beforeEach(() => {
      service = new DashboardWebSocketService(mockServer, mockSimulator);
    });

    it('should generate dashboard data from simulator', () => {
      const data = (service as any).getDashboardData();

      expect(mockSimulator.getStatistics).toHaveBeenCalled();
      expect(mockSimulator.getDetailedStatistics).toHaveBeenCalled();

      expect(data).toMatchObject({
        type: 'dashboard_update',
        loanApplications: 5,
        collateralTopUps: 3,
        deadActors: 2,
        activeClients: 4,
        isRunning: true,
        actors: expect.any(Array),
        performance: expect.any(Object),
        timestamp: expect.any(String)
      });
    });
  });
});