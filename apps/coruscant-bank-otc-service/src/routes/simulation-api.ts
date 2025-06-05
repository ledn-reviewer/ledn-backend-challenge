import express, { Router, Request, Response } from 'express';
import { ClientSimulator } from '../simulation/client-simulator';

/**
 * Create a router for simulator control endpoints
 */
export const createSimulationRouter = (simulator: ClientSimulator): Router => {
  const router = express.Router();

  // Endpoint to start the simulator
  router.post('/start', (_: Request, res: Response) => {
    if (simulator.isSimulatorRunning()) {
      return res.status(409).json({
        success: false,
        message: 'Simulator is already running'
      });
    }

    simulator.start();

    res.status(200).json({
      success: true,
      message: 'Simulator started successfully'
    });
  });

  // Endpoint to stop the simulator
  router.post('/stop', (_: Request, res: Response) => {
    if (!simulator.isSimulatorRunning()) {
      return res.status(409).json({
        success: false,
        message: 'Simulator is not running'
      });
    }

    simulator.stop();

    res.status(200).json({
      success: true,
      message: 'Simulator stopped successfully'
    });
  });

  // Endpoint to get simulator status and statistics
  router.get('/stats', (_: Request, res: Response) => {
    const stats = simulator.getStatistics();

    res.status(200).json({
      ...stats,
      timestamp: new Date().toISOString()
    });
  });

  // Enhanced endpoint for dashboard with detailed actor information
  router.get('/dashboard-stats', (_: Request, res: Response) => {
    const stats = simulator.getStatistics();
    const detailedStats = simulator.getDetailedStatistics();

    res.status(200).json({
      ...stats,
      ...detailedStats,
      timestamp: new Date().toISOString()
    });
  });

  // Endpoint to configure simulator settings
  router.post('/configure', (req: Request, res: Response) => {
    const { maxClients, actionIntervalMs } = req.body;

    if (simulator.isSimulatorRunning()) {
      return res.status(409).json({
        success: false,
        message: 'Cannot configure simulator while it is running. Stop the simulator first.'
      });
    }

    if (maxClients !== undefined && (typeof maxClients !== 'number' || maxClients < 1 || maxClients > 50)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid maxClients value. Must be a number between 1 and 50.'
      });
    }

    if (actionIntervalMs !== undefined && (typeof actionIntervalMs !== 'number' || actionIntervalMs < 100 || actionIntervalMs > 10000)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid actionIntervalMs value. Must be a number between 100 and 10000.'
      });
    }

    try {
      simulator.configure({ maxClients, actionIntervalMs });

      res.status(200).json({
        success: true,
        message: 'Simulator configuration updated successfully',
        config: {
          maxClients: simulator.getMaxClients(),
          actionIntervalMs: simulator.getActionInterval()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error configuring simulator'
      });
    }
  });

  return router;
};
