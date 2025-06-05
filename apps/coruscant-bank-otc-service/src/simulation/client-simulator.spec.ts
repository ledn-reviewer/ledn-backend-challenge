import { ClientSimulator } from './client-simulator';

describe('ClientSimulator', () => {
  let simulator: ClientSimulator;

  beforeEach(() => {
    // Create a simulator with test configuration
    simulator = new ClientSimulator({
      maxClients: 3,
      actionIntervalMs: 100,
      apiBaseUrl: 'http://localhost:3000'
    });
  });

  afterEach(() => {
    // Clean up
    if (simulator.isSimulatorRunning()) {
      simulator.stop();
    }
    jest.resetAllMocks();
  });

  it('should initialize in stopped state', () => {
    expect(simulator.isSimulatorRunning()).toBe(false);
  });

  it('should start and stop properly', () => {
    simulator.start();
    expect(simulator.isSimulatorRunning()).toBe(true);

    simulator.stop();
    expect(simulator.isSimulatorRunning()).toBe(false);
  });

  it('should provide statistics', () => {
    const stats = simulator.getStatistics();

    expect(stats).toHaveProperty('activeClients');
    expect(stats).toHaveProperty('loanApplications');
    expect(stats).toHaveProperty('collateralTopUps');
    expect(stats).toHaveProperty('deadActors');
    expect(stats).toHaveProperty('isRunning');
  });
});
