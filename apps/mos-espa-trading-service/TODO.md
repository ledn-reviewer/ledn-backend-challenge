# TODO: Mos Espa Trading Service

This service simulates the Mos Espa Beskar trading venue on Tatooine.

1. Project Setup
   - [ ] Initialize Node.js + TypeScript project (`npm init -y`, install TypeScript, ts-node).
   - [ ] Install dependencies: Express (or Fastify), AWS SDK v3, dotenv, uuid, Jest.
   - [ ] Configure `tsconfig.json` and ESLint/Prettier.
   - [ ] Add Dockerfile and register service in `docker-compose.yml`.

2. Environment & Configuration
   - [ ] Define environment variables in `.env` for LocalStack endpoints, SNS topic (`tatooine-mos-espa-prices`).
   - [ ] Configure AWS SNS client (publisher).

3. Price Publisher
   - [ ] Implement a scheduler or script to generate synthetic price events:
     - [ ] Randomize `levels` for quantities (1, 10, 50, 100).
     - [ ] Each event includes `eventId`, `asset: BESKAR`, `currency: GC`, `timestamp`, and `levels`.
   - [ ] Publish events to SNS topic `tatooine-mos-espa-prices` in JSON.
   - [ ] Handle retry logic on SNS failures.

4. Trade Orders Endpoint
   - [ ] **POST /orders**: Validate incoming JSON payload against OpenAPI schema.
   - [ ] Implement idempotency by requestId (track in-memory or persistent store).
   - [ ] Simulate random failures (~30% of calls) by returning a 200 with `success: false` and a `reason`.
   - [ ] On success, calculate a mock `price` (sum of quantity × a base price or random). Return full order response JSON.

5. Order Book Simulation (optional)
   - [ ] Maintain in-memory order book data structure for enhanced realism.
   - [ ] Update order book state on each trade.

6. Logging & Observability
   - [ ] Structured logging of received orders, outgoing events, and errors.
   - [ ] Expose health check endpoint (`GET /health`).

7. Testing
   - [ ] Unit tests for: request validation, idempotency logic, price generator, SNS publishing.
   - [ ] Integration tests against LocalStack: publish and subscribe to SNS topics, POST /orders.

8. Documentation
   - [ ] Update README with service endpoints and environment variables.

9. CI/CD
   - [ ] GitHub Actions to lint, type-check, test, and build Docker image.
