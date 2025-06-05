# TODO: Black Spire Outpost Trading Service

This service simulates the Black Spire Outpost Beskar trading venue on Batuu.

1. Project Setup
   - [ ] Initialize Node.js + TypeScript project (`npm init -y`, install TypeScript, ts-node).
   - [ ] Install dependencies: Express (or Fastify), AWS SDK v3, dotenv, uuid, Jest.
   - [ ] Configure `tsconfig.json` and ESLint/Prettier.
   - [ ] Add Dockerfile and register service in `docker-compose.yml`.

2. Environment & Configuration
   - [ ] Define environment variables in `.env` for LocalStack endpoints, SNS topic (`batuu-black-spire-outpost-price-stream`).
   - [ ] Configure AWS SNS client for publishing.

3. Price Publisher
   - [ ] Implement actor-based order book simulation:
     - [ ] Initialize a `lastClosingPrice` state.
     - [ ] Create multiple actor instances that, at random intervals:
       - [ ] Generate limit orders (buy or sell) at price levels near `lastClosingPrice`.
       - [ ] Assign volumes and group orders into amounts (1, 10, 50, 100).
     - [ ] Aggregate all actor orders into `buy` and `sell` arrays of {amount, price} price levels.
     - [ ] Update `lastClosingPrice` (e.g., mid-price of best bid/ask) after each event.
   - [ ] Publish price events with `item: BSK`, `time`, `buy`, and `sell` levels to SNS topic `batuu-black-spire-outpost-price-stream` in JSON.
   - [ ] Handle retry logic on SNS failures.

4. Trade Orders Endpoint
   - [ ] **POST /market/orders**: Validate incoming JSON payload against OpenAPI schema.
   - [ ] Implement idempotency using requestId tracking.
   - [ ] Simulate random failures (~30% of calls) returning HTTP 200 with `error` JSON field.
   - [ ] On success, calculate a mock `totalPrice` based on input `amount` and a base price, return full order response JSON.

5. Order Book Simulation (optional)
   - [ ] Maintain in-memory order book for realism.

6. Logging & Observability
   - [ ] Structured request/response logging.
   - [ ] Health check endpoint (`GET /health`).

7. Testing
   - [ ] Unit tests for request validation, idempotency, SNS publishes, scheduler logic.
   - [ ] Integration tests with LocalStack for SNS publish/subscribe, and the POST endpoint.

8. Documentation
   - [ ] Update README with service details, env vars, and endpoints.

9. CI/CD
   - [ ] GitHub Actions for lint, type-check, test, and Docker build.
