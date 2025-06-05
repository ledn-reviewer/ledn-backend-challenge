# TODO: Coruscant Bank OTC Service

This service simulates client activity and interactions with the bank.

1. Project Setup
   - [x] Initialize a Node.js/TypeScript project using `npm init` or `yarn init -y`.
   - [x] Install dependencies: Express (or Fastify), AWS SDK (v3), dotenv, TypeScript, ts-node, Mocha, Chai, Sinon.
   - [x] Configure TypeScript (`tsconfig.json`) and linting (ESLint).
   - [x] Create a Dockerfile and add service to `docker-compose.yml`.

2. Environment & Configuration
   - [x] Add `.env` for LocalStack endpoints and AWS credentials.
   - [x] Configure AWS SDK clients (SNS subscriber, SNS publisher).
   - [x] Define topic/queue names (`coruscant-bank-loan-events`).

3. HTTP API Endpoints
   - [x] **POST /loan-applications**: Accept loan application requests and forward to liquidation service.
   - [x] **POST /collateral-top-ups**: Accept collateral top-up requests and forward.
   - [x] Validate request payloads against the OpenAPI schemas using Zod.
   - [x] Implement idempotency (track `requestId`).
   - [x] Host Swagger/OpenAPI documentation with swagger-ui-express for browser access.
   - [x] Health check (e.g. /healthz endpoint).

4. SNS Subscription
   - [x] Subscribe to SNS topic `coruscant-bank-loan-events`.
   - [x] Implement an HTTP/S webhook or SQS queue to receive events.
   - [x] Process incoming loan events and log or store in-memory for simulation.

5. Client Simulation

   - [x] Simulate clients:
   - [x] Use the actor model: spawn up to 10 client actors, use an environment variable to control the number of clients. Use EventEmitter to communicate with actors.
   - [x] Each actor can take an action once a second, but configurable by an environment variable.
   - [x] Each actor has a random chance of taking an action or not.
   - [x] Actors create loan applications with initial collateral based on target LTV.
   - [x] Each actor fetches the current asset price before opening a loan on a client's behalf.
   - [x] Actors monitor their loan LTV and post additional collateral when LTV rises above a certain threshold (60-79% LTV), which depends on how much risk they are willing to tolerate. Their risk tolerance is randomly distributed between 0 and 1. Actors may post collateral more than once.
   - [x] Each actor has a random chance of being a shrimp (1 BSK), crab (1-10 BSK), octopus (10-50 BSK), fish (50-100 BSK), dolphin (100-500 BSK), shark (500-1000 BSK), whale (1000-5000 BSK), or humpback (5000-10000 BSK), which limits the size of the loans they could apply for.
   - [x] Actors die after they've posted collateral, and their risk of dying increases with each action taken. After 10 actions, an actor always dies.
   - [x] A brand new randomized actor takes the place of any dead actor.
   - [x] Randomize payloads (amount, loanId, borrowerId).
6. Logging & Auditing

   - [x] Integrate structured logging (console).
   - [x] Store a history of sent/received events in memory.

7. Error Handling & Resiliency

   - [x] Retries for transient HTTP/SNS failures.
   - [x] Graceful shutdown: close server, AWS connections, and event emitter subscriptions.

8. Testing

   - [x] Setup Jest.
   - [x] Unit tests (co-located with source files using `.spec.ts` suffix).
   - [x] Setup Cucumber and cucumber (test framework structure in place).
   - [x] Integration tests for major use cases

9. Actor Simulation Dashboard

     - [x] Create web-based graphical interface to monitor actor simulation
     - [x] Display real-time actor status and capabilities
       - [x] Show which actors can execute actions (active/inactive)
       - [x] Display actor execution success rates
       - [x] Show loan event reception status for each actor
    - [x] Performance metrics visualization
       - [x] Action execution timing/duration per actor
       - [x] Average response times for loan applications and collateral top-ups
       - [x] Success vs failure rates over time
    - [x] Actor lifecycle visualization
       - [x] Actor creation and death events
       - [x] Risk tolerance levels and action counts
       - [x] Actor types (shrimp, crab, octopus, fish, dolphin, shark, whale, humpback)
    - [x] Interactive controls
      - [x] Start/stop simulation
      - [x] Adjust actor count and action intervals
      - [x] Filter and sort actors by various metrics
    - [x] Integration with existing endpoints
      - [x] Extend existing health/events endpoints for dashboard data
      - [x] Add WebSocket support for real-time updates

10. Documentation

   - [ ] Update README with run instructions, environment variables, and endpoints.
   - [ ] Add Jsdoc plugin to eslint.
   - [ ] Set up Jsdoc and document the code.
   - [ ] Add npm scripts to generate HTML with JsDoc and to open it on the browser.

11. CI/CD

- [ ] Configure GitHub Actions: lint, type-check, run tests, build Docker image

12. Clean up

- [ ] Remove unused code.
- [ ] Fix all linting and formatting issues.
- [ ] Remove un

---
