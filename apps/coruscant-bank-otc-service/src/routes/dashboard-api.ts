import express, { Router, Request, Response } from 'express';
import path from 'path';
import { ClientSimulator } from '../simulation/client-simulator';

/**
 * Create a router for the simulation dashboard
 */
export const createDashboardRouter = (simulator: ClientSimulator): Router => {
  const router = express.Router();

  // Serve the main dashboard HTML page from the public directory
  router.get('/', (_: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../public/dashboard/index.html'));
  });

  // API endpoint to get simulation status
  router.get('/api/status', (_: Request, res: Response) => {
    res.json({
      isRunning: simulator.isSimulatorRunning(),
      timestamp: new Date().toISOString()
    });
  });

  // API endpoint to start the simulation
  router.post('/api/start', (_: Request, res: Response) => {
    try {
      simulator.start();
      res.json({ success: true, message: 'Simulation started' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  // API endpoint to stop the simulation
  router.post('/api/stop', (_: Request, res: Response) => {
    try {
      simulator.stop();
      res.json({ success: true, message: 'Simulation stopped' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  // API endpoint to get simulation statistics
  router.get('/api/statistics', (_: Request, res: Response) => {
    try {
      const stats = simulator.getStatistics();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // API endpoint to get detailed simulation statistics
  router.get('/api/statistics/detailed', (_: Request, res: Response) => {
    try {
      const detailedStats = simulator.getDetailedStatistics();
      res.json(detailedStats);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // API endpoint to configure the simulator
  router.post('/api/configure', (req: Request, res: Response) => {
    try {
      simulator.configure(req.body);
      res.json({
        success: true,
        message: 'Simulator configured',
        config: {
          maxClients: simulator.getMaxClients(),
          actionInterval: simulator.getActionInterval()
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  return router;
};
