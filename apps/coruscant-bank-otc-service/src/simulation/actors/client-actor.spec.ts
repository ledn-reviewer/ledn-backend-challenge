import { EventEmitter } from 'events';
import { ClientActor } from './client-actor';
import { ClientEvents, AssetPrice } from '../models/types';

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ status: 202 })
}));

// Mock PriceService
class MockPriceService {
  async getCurrentPrice(): Promise<AssetPrice> {
    return {
      price: 10000,
      timestamp: new Date()
    };
  }
}

describe('ClientActor', () => {
  let actor: ClientActor;
  let events: ClientEvents;
  let priceService: MockPriceService;
  let actionSpy: jest.Mock;

  beforeEach(() => {
    // Setup events
    events = new EventEmitter() as ClientEvents;
    actionSpy = jest.fn();
    events.on('action', actionSpy);

    // Setup price service
    priceService = new MockPriceService();

    // Create actor
    actor = new ClientActor(
      priceService,
      events,
      100,
      'http://localhost:3000'
    );
  });

  afterEach(() => {
    actor.stop();
    jest.resetAllMocks();
  });

  it('should initialize with valid client state', () => {
    const state = actor.getState();

    expect(state).toHaveProperty('borrowerId');
    expect(typeof state.borrowerId).toBe('string');

    expect(state).toHaveProperty('size');
    expect(typeof state.size).toBe('string');

    expect(state).toHaveProperty('maxLoanAmount');
    expect(typeof state.maxLoanAmount).toBe('number');

    expect(state).toHaveProperty('riskTolerance');
    expect(typeof state.riskTolerance).toBe('number');
    expect(state.riskTolerance).toBeGreaterThanOrEqual(0);
    expect(state.riskTolerance).toBeLessThanOrEqual(1);

    expect(state).toHaveProperty('actionsPerformed');
    expect(state.actionsPerformed).toBe(0);
  });

  it('should start and stop lifecycle', (done) => {
    // Start the actor
    actor.start();

    // Set up a timeout that's longer to account for probability gates
    // After multiple intervals, at least one action should be emitted
    const timeout = setTimeout(() => {
      actor.stop();
      // With 70% action probability and 80% loan creation probability,
      // over multiple intervals (15 tries), we should get at least one action
      expect(actionSpy).toHaveBeenCalled();
      done();
    }, 1500); // Give it 1.5 seconds for multiple intervals

    // Stop early if we get an action
    actionSpy.mockImplementation(() => {
      clearTimeout(timeout);
      actor.stop();
      expect(actionSpy).toHaveBeenCalled();
      done();
    });
  });
});
