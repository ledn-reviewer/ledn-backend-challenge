import express, { Router, Request, Response } from 'express';
import axios from 'axios';
import { publishLoanEvent, LoanEventMessage, isSelfPublishingEnabled } from '../services/sns/publisher';
import { validateLoanApplicationRequest, validateCollateralTopUpRequest, idempotencyCheck } from '../middleware/validators';
import { LoanEventStore } from '../handlers/loanEventHandler';
import { EventHistoryStore } from '../utils/event-store';
import logger from '../utils/logger';

// Create router
export const createApiRouter = (processedRequests: Set<string>): Router => {
  const router = express.Router();
  const eventStore = LoanEventStore.getInstance();
  const eventHistoryStore = EventHistoryStore.getInstance();
  const liqServiceUrl = process.env.LIQUIDATION_SERVICE_URL || 'http://localhost:4000';
  const selfPublishingEnabled = isSelfPublishingEnabled();

  // Common idempotency check middleware
  const checkIdempotency = idempotencyCheck(processedRequests);

  // Loan application endpoint
  router.post('/loan-applications',
    validateLoanApplicationRequest,
    checkIdempotency,
    async (req: Request, res: Response) => {
      const { requestId } = req.body;

      try {
        // Create loan event message
        const loanEvent: LoanEventMessage = {
          eventType: 'LOAN_APPLICATION',
          requestId,
          data: req.body,
          timestamp: new Date().toISOString()
        };

        // Process or publish the event based on configuration
        await publishLoanEvent(loanEvent);
        if (selfPublishingEnabled) {
          logger.info({ requestId, eventType: 'LOAN_APPLICATION' }, 'Loan application published to SNS');
        } else {
          logger.info({ requestId, eventType: 'LOAN_APPLICATION' }, 'Loan application processed (SNS publishing disabled)');
        }

        // Forward to liquidation service
        await axios.post(`${liqServiceUrl}/loan-applications`, req.body);
        logger.info({ requestId }, 'Loan application forwarded to liquidation service');

        res.status(202).json({
          message: 'Loan application submitted',
          requestId,
          timestamp: loanEvent.timestamp,
          publishedToSNS: selfPublishingEnabled
        });
      } catch (error) {
        logger.error({ error, requestId }, 'Error processing loan application');
        res.status(500).json({ error: 'Processing failure', requestId });
      }
    }
  );

  // Collateral top-up endpoint
  router.post('/collateral-top-ups',
    validateCollateralTopUpRequest,
    checkIdempotency,
    async (req: Request, res: Response) => {
      const { requestId } = req.body;

      try {
        // Create top-up event message
        const topUpEvent: LoanEventMessage = {
          eventType: 'COLLATERAL_TOP_UP',
          requestId,
          data: req.body,
          timestamp: new Date().toISOString()
        };

        // Process or publish the event based on configuration
        await publishLoanEvent(topUpEvent);
        if (selfPublishingEnabled) {
          logger.info({ requestId, eventType: 'COLLATERAL_TOP_UP' }, 'Collateral top-up published to SNS');
        } else {
          logger.info({ requestId, eventType: 'COLLATERAL_TOP_UP' }, 'Collateral top-up processed (SNS publishing disabled)');
        }

        // Forward to liquidation service
        await axios.post(`${liqServiceUrl}/collateral-top-ups`, req.body);
        logger.info({ requestId }, 'Collateral top-up forwarded to liquidation service');

        res.status(202).json({
          message: 'Collateral top-up submitted',
          requestId,
          timestamp: topUpEvent.timestamp,
          publishedToSNS: selfPublishingEnabled
        });
      } catch (error) {
        logger.error({ error, requestId }, 'Error processing collateral top-up');
        res.status(500).json({ error: 'Processing failure', requestId });
      }
    }
  );

  // Health check endpoints
  router.get('/health', (_: Request, res: Response) => {
    res.json({
      status: 'ok',
      eventCount: eventStore.getEvents().length,
      selfPublishingEnabled
    });
  });

  // Standard Kubernetes health check endpoint
  router.get('/healthz', (_: Request, res: Response) => {
    res.status(200).send('ok');
  });

  // Endpoint to get all received events (for debugging/monitoring)
  router.get('/events', (_: Request, res: Response) => {
    res.json({
      events: eventStore.getEvents()
    });
  });

  // Event history endpoints
  router.get('/event-history', (req: Request, res: Response) => {
    const type = req.query.type as string | undefined;
    const direction = req.query.direction as 'INBOUND' | 'OUTBOUND' | undefined;
    const fromTimestamp = req.query.fromTimestamp as string | undefined;

    const events = eventHistoryStore.getEvents({
      type,
      direction,
      fromTimestamp
    });

    res.json({
      count: events.length,
      events
    });
  });

  router.get('/event-history/:id', (req: Request, res: Response) => {
    const event = eventHistoryStore.getEventById(req.params.id);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    res.json({ event });
  });

  return router;
}
