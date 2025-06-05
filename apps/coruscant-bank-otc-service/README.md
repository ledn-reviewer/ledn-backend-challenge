# Coruscant Bank OTC Service

This service simulates client activity and interactions with the Coruscant Bank.

## Features

- HTTP API endpoints for loan applications and collateral top-ups
- SNS subscription to loan events
- Client simulation using the actor model
- OpenAPI documentation
- Structured logging with Pino
- Event history storage and tracking

## Installation

```bash
# Install dependencies
npm install
```

## Running Locally

```bash
# Development mode
npm run dev

# Build and start production server
npm run build
npm start
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `LIQUIDATION_SERVICE_URL`: URL of the liquidation service
- `AWS_ENDPOINT`: LocalStack endpoint
- `AWS_REGION`: AWS region
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `LOAN_EVENTS_TOPIC`: SNS topic name
- `LOAN_QUEUE_NAME`: SQS queue name
- `SIMULATOR_MAX_CLIENTS`: Maximum number of client actors (default: 10)
- `SIMULATOR_ACTION_INTERVAL_MS`: Interval between actions in ms (default: 1000)
- `SIMULATOR_AUTO_START`: Set to "true" to auto-start simulation
- `LOG_LEVEL`: Logging level (default: 'info')
- `EVENT_LOG_PATH`: Path to store event logs (default: './logs/events.log')
- `MAX_IN_MEMORY_EVENTS`: Maximum number of events to keep in memory (default: 1000)
- `ENABLE_SELF_PUBLISHING`: Set to "true" to enable self-publishing of loan events to the SNS topic (default: false)

## Docker

### Building the Docker Image

```bash
# Build the Docker image
npm run docker:build

# Build with a timestamped tag
npm run docker:build:tagged
```

### Running the Docker Image

```bash
# Run the Docker container
npm run docker:run

# Build and run in one command
npm run docker:build:run
```

### Docker Compose Integration

```bash
# Build the service in Docker Compose
npm run docker:compose:build

# Run the service with Docker Compose
npm run docker:compose:up

# View logs
npm run docker:compose:logs
```

## Logging & Auditing

The service includes comprehensive structured logging and event tracking:

### Structured Logging

- Uses [Pino](https://getpino.io/) for high-performance structured logging
- Configurable log levels via `LOG_LEVEL` environment variable
- Pretty printing in development mode
- Request/response logging for all API endpoints

### Event History

The service tracks all incoming and outgoing events:

- In-memory storage with configurable capacity
- Optional persistent file storage
- Event history API for querying and monitoring events

## Event History API Endpoints

- `GET /event-history`: Get all events with optional filtering
  - Query parameters:
    - `type`: Filter by event type
    - `direction`: Filter by direction ('INBOUND' or 'OUTBOUND')
    - `fromTimestamp`: Filter events after this timestamp
    - `limit`: Limit the number of returned events
- `GET /event-history/:id`: Get a specific event by ID

## Simulation API Endpoints

- `POST /simulation/start`: Start the client simulation
- `POST /simulation/stop`: Stop the client simulation
- `GET /simulation/stats`: Get simulation statistics

## Client Simulation

The service includes a client simulation feature that simulates multiple clients interacting with the bank:

- Uses the actor model with up to 10 client actors (configurable)
- Clients create loan applications, monitor loans, and add collateral when needed
- Clients have different sizes (shrimp, crab, octopus, etc.) with loan limits
- Clients have random risk tolerance and behaviors
