import express, { Router, Request, Response } from 'express';
import { EventHistoryStore } from '../utils/event-store';
import logger from '../utils/logger';

/**
 * Create router for event history API endpoints
 */
export const createEventHistoryRouter = (): Router => {
  const router = express.Router();
  const eventHistoryStore = EventHistoryStore.getInstance();

  // Get all events with optional filtering
  router.get('/', (req: Request, res: Response) => {
    try {
      const type = req.query.type as string | undefined;
      const direction = req.query.direction as 'INBOUND' | 'OUTBOUND' | undefined;
      const fromTimestamp = req.query.fromTimestamp as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      // Get events from memory
      const events = eventHistoryStore.getEvents({
        type,
        direction,
        fromTimestamp
      });

      // Apply limit if specified
      const limitedEvents = limit && limit > 0 ? events.slice(-limit) : events;

      // Sort events by timestamp
      limitedEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      res.json({
        count: limitedEvents.length,
        totalCount: events.length,
        events: limitedEvents
      });
    } catch (error) {
      logger.error({ error }, 'Error retrieving event history');
      res.status(500).json({ error: 'Failed to retrieve event history' });
    }
  });

  // Get event by ID
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const event = eventHistoryStore.getEventById(req.params.id);

      if (!event) {
        return res.status(404).json({
          error: 'Event not found'
        });
      }

      res.json({ event });
    } catch (error) {
      logger.error({ error, eventId: req.params.id }, 'Error retrieving event');
      res.status(500).json({ error: 'Failed to retrieve event' });
    }
  });

  return router;
};
