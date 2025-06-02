# Ledn's Backend Technical Challenge

## Introduction

Welcome to Ledn's Backend Technical Challenge! This challenge was designed to try to reproduce challenges Ledn faces actively.

To make this experience engaging and relevant, we've infused the challenge with a touch drawing inspiration from the Star Wars theme.

## Getting started

1. Create a new private repository on your personal GitHub account.
2. Copy the contents of this challenge to your new private repository.
3. Start the application using `docker compose up` or `podman compose up`
4. Fulfill the requirements outlined in this challenge.
5. Invite `ledn-reviewer` as a collaborator to your private repository once it is ready for review.
6. Email your contact at Ledn with a confirmation that `ledn-reviewer` has been added as a contributor and your project is ready for review.
7. We encourage the use of Generative AI in your development process. However, you are still required to demonstrate understanding of the tradeoffs being made in terms of technology choices, design patterns, and ultimately the source code. Keep in mind that you are the ultimate owner of the code you submit to us for review.
8. You are welcome to email your contact at Ledn with questions about the challenge.

## The Challenge

In the billions of habitable systems in the vast galaxy, **Beskar** (also known as Mandalorian steel) stands as a rare and invaluable alloy, impervious to lightsabers and blasters alike. Its scarcity makes it a highly coveted asset. At **Coruscant Bank**, we offer a unique financial service: Beskar-Backed Loans, providing liquidity to individuals holding this precious metal.

Our operations span the galaxy, with primary Beskar markets located in the bustling trade hubs of **Mos Espa** and **Black Spire Outpost**. From these critical locations, we meticulously source real-time Beskar pricing information. Following the tumultuous fall of the Empire, all loans are now disbursed in the universally accepted **Galactic Credit Standard**.

Due to the inherent market volatility of Beskar, Coruscant Bank employs a stringent lending policy to mitigate risk: we only accept loan applications collateralized at a **2:1 ratio**. This means clients must post twice the value of Beskar (valued in Galactic Credits) for every Galactic Credit they wish to receive as a disbursement. In essence, new loans become active when their **Loan-to-Value (LTV) ratio is 50%**. For reference, the equation for LTV is: `LTV = Collateral * Current Price / Outstanding Balance`.

This challenge tasks you with building a critical component of Coruscant Bank's financial infrastructure: the **Liquidation Service**.

## The Challenge: Implement Coruscant Bank's Liquidation Service

Your mission is to implement a robust and reliable backend service that handles the lifecycle of Beskar-backed loans, from application to potential liquidation. This service must seamlessly integrate with existing external services, demonstrating your ability to build interconnected systems.

### Technical Requirements

Your implementation of Coruscant Bank's liquidation service must fulfill the following functionalities:

1. **Consume Price Streams**: Continuously ingest real-time Beskar trading prices from two distinct markets:
    * **Mos Espa**
    * **Black Spire Outpost**

2. **Loan Management API**: Expose RESTful endpoints for bank representatives to:
    * **Register New Loan Applications**: Allow the creation of new loan requests.
    * **Increase Collateral Balance**: Enable clients to post additional Beskar collateral for an existing loan.
    * **Get List of Loans**: Provide a comprehensive list of all registered loans and their current status.

3. **Loan Activation**: Automatically mark loans as **active** once 100% of their required Beskar collateral has been successfully posted.

4. **Automated Liquidation**: Identify and liquidate active loans that reach or exceed the **liquidation threshold of 80% LTV**. When a loan is liquidated, your service must sell just enough collateral to cover the disbursed loan amount.

5. **Branch Notifications**: Upon successful liquidation of a loan, simultaneously notify all Coruscant Bank branches.

### External Integration Notes

Requests to sell Beskar must be made using HTTP requests to either Mos Espa or Black Spire Outpost. Be prepared for real-world scenarios: these external trading services are designed to **randomly fail approximately 30% of the time**.

### Non-Functional Requirements

Your solution must adhere to the following critical constraints:

* **Auditing**: A complete history of all operations (loan applications, collateral postings, liquidations, warnings, trade orders) must be meticulously kept. It's not necessary to implement endpoints to see this data.
* **Interoperability**: You must adhere to schema definitions strictly.
* **Idempotency**: A loan **must not be liquidated more than once**.
* **Consistency**: It **must not be possible to post collateral for a loan that has already been liquidated**.
* **Robustness**: It must handle **unexpected inputs** gracefully wi
* **Scalability**: It must be possible to run multiple instances of the service.
* **Resiliency**: Once the liquidation process begins, it **must continue** even if the loan's LTV temporarily drops below the liquidation threshold during the process or because of failures.

## Evaluation Criteria

Your solution will be evaluated on the following aspects:

* **Correctness and Completeness**: How accurately and thoroughly does your service meet all specified requirements and constraints?
* **System Integration**: Demonstrate robust and resilient integration with the provided external services, including handling their simulated failures gracefully.
* **Error Handling and Resiliency**: How well does your service handle unexpected scenarios, such as network failures, invalid inputs, and external service outages?
* **Code Quality**: Readability, maintainability, modularity, project structure, and adherence to best practices.
* **Scalability and Performance Considerations**: While not a full-scale production system, consider how your design choices would impact scalability and performance.
* **Testing**: Evidence of comprehensive unit, and integration tests to ensure the reliability of your service.
* **Documentation**: Clear and concise documentation explaining your architecture, design choices, and how to run and test your solution.
* **Generative AI**: How well does the candidate leverage the use of AI during the coding process?

## Existing Services

As part of this challenge, you will be provided with source code and a Compose file to spin up several existing services. Your solution **must integrate with these services** but **must not modify or use their internal source code directly**. We will be making use of LocalStack for simulating AWS resources.

### Coruscant Bank OTC Service

This service simulates client activity and interactions with the bank.

* **Client Activity**: Simulates various actors (e.g., borrowers).
* **Loan Liquidation Events**: Subscribed to events published on the SNS topic `coruscant-bank-loan-liquidation-events`.
  * **Schema for Liquidation Event Messages (Body)**:
    * `eventId`: A `string` identifying the unique event.
    * `eventType`: `liquidation`
    * `loanId`: A `string` representing the unique loan.
    * `collateralSold`: A `string` representing units of collateral that were sold.
    * `collateralSoldValue`: A `string` representing the value of collateral sold in Galactic Credits.
    * `outstandingCollateral`: A `string` representing units of collateral that ought to be returned to the client.
    * `outstandingBalance`: A `string` representing any outstanding balance in Galactic Credits.
* **New Loan Applications**: Sends new loan application requests to the liquidation service using HTTP.
  * **Schema for Loan Application Messages (Body)**:
    * `requestId`: A `string` identifying the unique request to apply for a loan. Used for idempotency and log correlation.
    * `loanId`: A `string` identifying the unique loan.
    * `amount`: A `string` representing the amount the client requests to be disbursed in Galactic Credits.
    * `borrowerId`: A `string` representing the client.
* **Collateral Top-ups**: Sends requests to increase collateral balance to the liquidation service using HTTP.
  * **Schema for Collateral Top-up Messages (Body)**:
    * `requestId`: A `string` identifying the unique request to add collateral. Used for idempotency and log correlation.
    * `loanId`: A `string` identifying the unique loan.
    * `borrowerId`: A `string` identifying the client that owns the loan.
    * `amount`: A `string` representing the units of Beskar.

### Trading Service (Mos Espa, Tatooine)

This service manages an order book and simulates trading activity for Beskar on Tatooine.

* **Order Book & Trading Simulation**: Manages an order book and simulates market actors.
* **Price Events**: Publishes price events to the SNS topic `tatooine-mos-espa-prices`.
  * **Schema**:
    * `eventId`: A `string` identifying the unique price event. Used for log correlation.
    * `asset`: `BESKAR`
    * `currency`: `GC`
    * `timestamp`: `string` representing the date since Battle of Yavin in RFC 3339 format.
    * `levels`: An `array` of price levels.
      * `quantity`: `1`, `10`, `50`, or `100` units of Beskar.
      * `buy`: A `string` with the effective price of buying a given `quantity` of the asset.
      * `sell`: A `string` with the effective price of selling a given `quantity` of the asset.
* **Trade Orders**: Accepts trade orders via HTTP POST.
  * **`POST /orders`**
    * **Request Body Schema (JSON)**:
      * `requestId`: A `string` identifying the unique request. Used for idempotency and log correlation.
      * `type`: `market`
      * `side`: `buy` or `sell`
      * `asset`: `BESKAR`
      * `currency`: `GC`
      * `quantity`: A `string` with the units of asset to trade.
    * **Successful Response Schema (JSON)**:
      * `orderId`: A `string` identifying the order in the order book.
      * `success`: `true`
      * `type`: `market`
      * `side`: `buy` or `sell`
      * `asset`: `BESKAR`
      * `currency`: `GC`
      * `quantity`: A `string` with the total units of asset traded.
      * `price`: A `string` with the total Galactic Credits traded.
      * `requestId`: A `string` identifying the unique request. Used for idempotency and log correlation.
    * **Unsuccessful Response Schema (JSON)**:
      * `requestId` (if available)
      * `success`: `false`
      * `reason`: A `string` explaining the reason for failure.

### Trading Service (Black Spire Outpost, Batuu)

This service also manages an order book and simulates trading activity, but specifically for Black Spire Outpost on Batuu.

* **Order Book & Trading Simulation**: Manages an order book and simulates market actors.
* **Price Events**: Publishes prices to the SNS topic `batuu-black-spire-outpost-price-stream`.
  * **Schema**:
    * `item`: `STEEL:MANDALORIAN` (equivalent to Beskar) or other.
    * `time`: `number` of seconds since the Battle of Yavin (same as UNIX Timestamp).
    * `buy`: An `array` of buy price levels.
      * `amount`: `1`, `10`, `50`, or `100` units.
      * `price`: A `number` with the effective price of buying a given `amount` of the asset.
    * `sell`: An `array` of sell price levels.
      * `amount`: `1`, `10`, `50`, or `100` units.
      * `price`: A `number` with the effective price of selling a given `amount` of the asset.
* **Trade Orders**: Accepts trade orders via HTTP POST.
  * **`POST /market/orders`**
    * **Request Body Schema (JSON)**:
      * `requestId`: A `string` uniquely identifying the request. Used for idempotency and log correlation.
      * `side`: `BUY` or `SELL`
      * `item`: `STEEL:MANDALORIAN`
      * `amount`: A `number` representing units of `item` to trade.
    * **Successful Response Schema (JSON)**:
      * `requestId`: A `string` uniquely identifying the request. Used for idempotency and log correlation.
      * `id`: A `string` identifying the unique order.
      * `side`: `BUY` or `SELL`
      * `item`: `STEEL:MANDALORIAN`
      * `amount`: A `number` representing units of `item` traded.
      * `totalPrice`: A `number` with the total Galactic Credits traded.
    * **Unsuccessful Response Schema (JSON)**:
      * `requestId` (if available)
      * `error`: A `string` explaining the reason for the failure.

---
